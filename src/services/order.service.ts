import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'
import { OrderStatus, StreamStatus, MovementType } from '@prisma/client'
import { canelaBankService } from '@/services/canela-bank.service'
import { inventoryService } from './inventory.service'
import { v2 as cloudinary } from 'cloudinary'
import { GoogleGenAI } from '@google/genai'

export interface OrderItemInput {
  productId: number
  quantity: number
}

export interface CreateOrderInput {
  clientName: string
  whatsapp: string
  tiktokUsername?: string
  streamId?: number
  items: OrderItemInput[]
}

export interface OrderFilters {
  streamId?: number
  status?: OrderStatus
  buyerId?: number
}

export const orderService = {
  list: (filters?: OrderFilters) => {
    const where: any = {}

    if (filters?.streamId) where.streamId = filters.streamId
    if (filters?.status) where.status = filters.status
    if (filters?.buyerId) where.buyerId = filters.buyerId

    return prisma.order.findMany({
      where,
      include: {
        buyer: true,
        stream: {
          select: { id: true, title: true, status: true },
        },
        orderItems: {
          include: { product: true },
        },
        receipt: true,
      },
      orderBy: { id: 'desc' },
    })
  },

  getById: async (id: number) => {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        buyer: true,
        stream: true,
        orderItems: {
          include: { product: true },
        },
        receipt: true,
      },
    })
    if (!order) throw new AppError('Order not found', 404)
    return order
  },

  create: async ({
    clientName,
    whatsapp,
    tiktokUsername,
    streamId,
    items,
  }: CreateOrderInput) => {
    if (!items || items.length === 0) {
      throw new AppError('Order must contain at least one item', 400)
    }

    let targetStreamId = streamId
    if (!targetStreamId) {
      const activeStream = await prisma.stream.findFirst({
        where: { status: StreamStatus.LIVE },
      })
      if (!activeStream) {
        throw new AppError(
          'No active LIVE stream found to attach this order',
          400,
        )
      }
      targetStreamId = activeStream.id
    }

    let buyer = await prisma.buyer.findFirst({
      where: { whatsapp: whatsapp.trim() },
    })

    if (!buyer) {
      buyer = await prisma.buyer.create({
        data: {
          clientName: clientName.trim(),
          whatsapp: whatsapp.trim(),
          tiktokUsername: tiktokUsername?.trim(),
        },
      })
    }

    const productIds = items.map((i) => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })

    if (products.length !== items.length) {
      throw new AppError('One or more products were not found', 400)
    }

    let calculatedTotal = 0
    const orderItemsData = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!

      if (product.stock < item.quantity) {
        throw new AppError(
          `Insufficient stock for product: ${product.name}`,
          400,
        )
      }

      calculatedTotal += Number(product.price) * item.quantity

      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
      }
    })

    const order = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        streamId: targetStreamId,
        totalPrice: calculatedTotal,
        status: OrderStatus.PENDING,
        orderItems: {
          create: orderItemsData,
        },
      },
      include: {
        buyer: true,
        stream: true,
        orderItems: { include: { product: true } },
      },
    })

    if (tiktokUsername) {
      for (const item of items) {
        const pendingRes = await prisma.reservation.findFirst({
          where: {
            streamId: targetStreamId,
            tiktokUsername: tiktokUsername.trim(),
            productId: item.productId,
            status: 'PENDING',
          },
        })

        if (pendingRes) {
          await prisma.reservation.update({
            where: { id: pendingRes.id },
            data: { status: 'CLAIMED', orderId: order.id },
          })
        }
      }
    }

    return order
  },

  updateStatus: async (id: number, status: OrderStatus) => {
    await orderService.getById(id)

    return prisma.order.update({
      where: { id },
      data: { status },
      include: {
        buyer: true,
        stream: true,
        orderItems: { include: { product: true } },
        receipt: true,
      },
    })
  },

  generateQr: async (id: number) => {
    const order = await orderService.getById(id)

    if (order.status === OrderStatus.PAID) {
      throw new AppError('Order is already paid', 400)
    }

    const expectedGloss = `Pago Orden #${order.id} - ${order.buyer.clientName}`

    const qrResponse = await canelaBankService.generateQr({
      amount: Number(order.totalPrice),
      gloss: expectedGloss,
    })

    const uploadResult = await cloudinary.uploader.upload(qrResponse.qrImage, {
      folder: 'tiktok-live-sales/qrs',
    })

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        qrId: qrResponse.aliasRef,
        transactionId: expectedGloss,
      },
      include: {
        buyer: true,
        orderItems: { include: { product: true } },
      },
    })

    return {
      order: updatedOrder,
      qrImageUrl: uploadResult.secure_url,
      qrUrl: qrResponse.paymentUrl,
    }
  },

  syncPayment: async (id: number) => {
    const order = await orderService.getById(id)
    if (!order.qrId)
      throw new AppError('Order does not have a generated QR', 400)
    if (order.status === OrderStatus.PAID) return order

    const paymentStatus = await canelaBankService.getPaymentStatus(order.qrId)

    if (paymentStatus.status === 'PAID') {
      for (const item of order.orderItems) {
        await inventoryService.registerMovement({
          productId: item.productId,
          quantity: item.quantity,
          movementType: MovementType.OUT,
        })
      }

      return prisma.order.update({
        where: { id },
        data: { status: OrderStatus.PAID },
        include: {
          buyer: true,
          orderItems: { include: { product: true } },
        },
      })
    }

    return order
  },

  processReceiptOCR: async (id: number, receiptUrl: string) => {
    const order = await orderService.getById(id)

    if (order.status === OrderStatus.PAID) {
      throw new AppError('La orden ya ha sido pagada y validada.', 400)
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new AppError(
        'El motor de validacion OCR (Gemini) no esta configurado.',
        500,
      )
    }

    const imageRes = await fetch(receiptUrl)
    const imageBuffer = await imageRes.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const mimeType = imageRes.headers.get('content-type') || 'image/jpeg'

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const prompt = `Eres un validador de transferencias bancarias de Bolivia.
Analiza la imagen del comprobante y extrae:
1. El monto total pagado (solo el número, sin letras ni símbolos de moneda).
2. El Motivo, Referencia, Glosa o Detalle (el texto exacto introducido por el cliente).

Devuelve ÚNICAMENTE un JSON con esta estructura estricta, sin formato markdown ni texto adicional:
{ "monto": 150.50, "referencia": "texto_extraido" }`

    let aiResponse: any = null
    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      try {
        attempts++
        aiResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { data: base64Image, mimeType } },
                { text: prompt },
              ],
            },
          ],
        })
        break
      } catch (aiError: any) {
        console.error(
          `Intento ${attempts} fallido en Gemini API:`,
          aiError.message,
        )
        if (attempts >= maxAttempts) {
          console.error(
            'ERROR CRITICO EN GEMINI API (Agotados los reintentos):',
            aiError,
          )
          throw new AppError(
            `Error comunicándose con la IA: ${aiError.message || 'Desconocido'}`,
            503,
          )
        }
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    const rawText = aiResponse.text || '{}'
    const cleanJson = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()

    let extractedData
    try {
      extractedData = JSON.parse(cleanJson)
    } catch (error) {
      throw new AppError(
        'La IA no pudo procesar el comprobante correctamente por baja legibilidad.',
        400,
      )
    }

    const extractedAmount = Number(extractedData.monto)
    const extractedReference = extractedData.referencia || ''

    if (extractedAmount < Number(order.totalPrice)) {
      throw new AppError(
        `Pago rechazado: El monto pagado (Bs. ${extractedAmount}) es menor al total de la orden (Bs. ${order.totalPrice}).`,
        400,
      )
    }

    const expectedGloss = order.transactionId || `Pago Orden #${order.id}`
    const cleanExpected = expectedGloss.toLowerCase().replace(/\s+/g, '')
    const cleanExtracted = extractedReference.toLowerCase().replace(/\s+/g, '')

    if (
      !cleanExtracted.includes(cleanExpected) &&
      !cleanExpected.includes(cleanExtracted)
    ) {
      throw new AppError(
        `Pago rechazado: La referencia no coincide. Esperada: '${expectedGloss}', Encontrada: '${extractedReference}'.`,
        400,
      )
    }

    await prisma.receipt.create({
      data: {
        orderId: id,
        imageUrl: receiptUrl,
        extractedAmount: extractedAmount,
        validationStatus: 'VALIDATED',
      },
    })

    for (const item of order.orderItems) {
      await inventoryService.registerMovement({
        productId: item.productId,
        quantity: item.quantity,
        movementType: MovementType.OUT,
      })
    }

    return prisma.order.update({
      where: { id },
      data: { status: OrderStatus.PAID },
      include: {
        buyer: true,
        orderItems: { include: { product: true } },
        receipt: true,
      },
    })
  },
}
