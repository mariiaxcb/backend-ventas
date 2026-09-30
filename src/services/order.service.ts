import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'
import { OrderStatus, StreamStatus, MovementType } from '@prisma/client'
import { canelaBankService } from '@/services/canela-bank.service'
import { inventoryService } from './inventory.service'
import { v2 as cloudinary } from 'cloudinary'
import { getIO } from '@/websockets/socket.server'

import { createWorker } from 'tesseract.js'

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
    } else if (tiktokUsername) {
      // Actualizar tiktokUsername siempre que se proporcione uno nuevo
      buyer = await prisma.buyer.update({
        where: { id: buyer.id },
        data: { tiktokUsername: tiktokUsername.trim() },
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

    // Emitir evento de nuevo pedido
    try {
      const io = getIO()
      io.emit('pedido:nuevo', { pedido: order })
    } catch (error) {
      console.error('Error emitiendo evento pedido:nuevo:', error)
    }

    return order
  },

  updateStatus: async (id: number, status: OrderStatus) => {
    await orderService.getById(id)

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        buyer: true,
        stream: true,
        orderItems: { include: { product: true } },
        receipt: true,
      },
    })

    // Emitir evento de pedido actualizado
    try {
      const io = getIO()
      io.emit('pedido:actualizado', { pedido: updatedOrder })

      // Si el pago fue validado, avisar al bot para que notifique al cliente
      if (status === OrderStatus.PAID) {
        io.emit('pago:validado', {
          pedidoId: updatedOrder.id,
          whatsapp: updatedOrder.buyer?.whatsapp,
          nombreCliente: updatedOrder.buyer?.clientName,
          tiktokUsername: updatedOrder.buyer?.tiktokUsername,
        })
      }
    } catch (error) {
      console.error('Error emitiendo evento pedido:actualizado:', error)
    }

    return updatedOrder
  },

  generateQr: async (id: number) => {
    const order = await orderService.getById(id)

    if (order.status === OrderStatus.PAID) {
      throw new AppError('Order is already paid', 400)
    }

    // Formato: #orden - codigo producto - @usuario tiktok
    const productCode = order.orderItems[0]?.product?.code || 'N/A'
    const usuarioTiktok = order.buyer?.tiktokUsername || order.buyer?.clientName || 'cliente'
    const expectedGloss = `#${order.id} - ${productCode} - @${usuarioTiktok}`

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

    const imageRes = await fetch(receiptUrl)
    const imageBuffer = await imageRes.arrayBuffer()
    const buffer = Buffer.from(imageBuffer)

    const worker = await createWorker('spa+eng')

    let recognizedText = ''
    try {
      const ret = await worker.recognize(buffer)
      recognizedText = ret.data.text
    } catch (ocrError: any) {
      throw new AppError('No se pudo leer la imagen del comprobante.', 400)
    } finally {
      await worker.terminate()
    }

    const cleanText = recognizedText.replace(/\r?\n/g, ' ')

    const amountRegex = /(?:bs\.?|monto|suma)?\s*[:]?\s*([0-9]+[.,][0-9]{2})/gi
    const matches = [...cleanText.matchAll(amountRegex)]

    let extractedAmount = 0
    if (matches.length > 0) {
      extractedAmount = parseFloat(
        matches[matches.length - 1][1].replace(',', '.'),
      )
    } else {
      const fallbackNumbers = cleanText.match(/\b\d+[\.,]\d{2}\b/g)
      if (fallbackNumbers && fallbackNumbers.length > 0) {
        extractedAmount = parseFloat(
          fallbackNumbers[fallbackNumbers.length - 1].replace(',', '.'),
        )
      }
    }

    // Extraer referencia del comprobante.
    // El OCR suele leer mal el simbolo # (por ejemplo "#37" como "437"), asi que
    // se valida contra varias alternativas: el numero de orden o el codigo
    // del producto, que unico por pedido.
    const productCode = order.orderItems[0]?.product?.code || ''

    const orderIdPatterns = [
      /#\s*(\d+)/i,
      /referencia[:\s]*(\d+)/i,
      productCode
        ? new RegExp(`${productCode}[\\s\\-–—]*@?\\s*(\\d+)`, 'i')
        : null,
    ].filter(Boolean) as RegExp[]

    const extractedOrderId =
      orderIdPatterns
        .map((pattern) => cleanText.match(pattern)?.[1])
        .find(Boolean) ?? null

    const productCodeFound =
      productCode && cleanText.toLowerCase().includes(productCode.toLowerCase())

    if (!extractedAmount || extractedAmount < Number(order.totalPrice)) {
      throw new AppError(
        `Pago rechazado: El monto detectado (Bs. ${extractedAmount}) es menor al total de la orden (Bs. ${order.totalPrice}).`,
        400,
      )
    }

    const orderIdValid = extractedOrderId === order.id.toString()

    if (!orderIdValid && !productCodeFound) {
      throw new AppError(
        `Pago rechazado: La referencia o número de orden no coincide en el comprobante.`,
        400,
      )
    }

    // El OCR SOLO verifica informacion del comprobante (monto + referencia).
    // No debe modificar la identidad del comprador: el texto reconocido suele
    // venir corrupto (ej. "aues") y terminaba corrompiendo el nombre real.
    // Para notificar al cliente se usa buyer.tiktokUsername.

    const receipt = await prisma.receipt.create({
      data: {
        orderId: id,
        imageUrl: receiptUrl,
        extractedAmount: extractedAmount,
        validationStatus: 'PENDING',
      },
    })

    // NO marcar como PAID - el vendedor debe validar manualmente
    // Solo actualizar a IN_REVIEW para indicar que está pendiente de validación
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: OrderStatus.IN_REVIEW },
      include: {
        buyer: true,
        orderItems: { include: { product: true } },
        receipt: true,
      },
    })

    // Emitir evento de comprobante recibido para notificar al vendedor
    try {
      const io = getIO()
      io.emit('comprobante:recibido', {
        pedido: updatedOrder,
        comprobante: {
          id: receipt.id,
          imageUrl: receipt.imageUrl,
          extractedAmount: receipt.extractedAmount,
          validationStatus: receipt.validationStatus,
        },
      })
    } catch (error) {
      console.error('Error emitiendo evento comprobante:recibido:', error)
    }

    return updatedOrder
  },
}
