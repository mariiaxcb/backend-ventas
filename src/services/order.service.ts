import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'
import { OrderStatus, StreamStatus, MovementType } from '@prisma/client'
import { canelaBankService } from '@/services/canela-bank.service'
import { inventoryService } from './inventory.service'
import {
  extractReceiptData,
  validateReceipt,
} from './receipt-validation.service'
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
    const previousOrder = await orderService.getById(id)

    // El stock se descuenta cuando el pago queda confirmado, no cuando el OCR
    // pasa la revisión: hasta que el vendedor no confirma, la unidad sigue
    // disponible. La comprobación sobre el estado previo mantiene el descuento
    // única vez aunque el webhook del banco y el vendedor validen la misma orden.
    const yaEstabaCobrada =
      previousOrder.status === OrderStatus.PAID ||
      previousOrder.status === OrderStatus.DELIVERED
    const confirmaPago = status === OrderStatus.PAID && !yaEstabaCobrada

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

    // Avisamos antes de tocar el inventario: el pago ya está confirmado y el
    // cliente debe enterarse pase lo que pase. El descuento de stock es un
    // efecto secundario y no puede impedir la notificación, ni dejar un
    // pedido pagado sin avisar (por ejemplo si el stock se agotó).
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

      // El vendedor rechazó el comprobante: el bot le pide al cliente que
      // verifique. Sin este evento el cliente se queda esperando una
      // confirmación que nunca llega.
      if (status === OrderStatus.REJECTED) {
        io.emit('pago:rechazado', {
          pedidoId: updatedOrder.id,
          whatsapp: updatedOrder.buyer?.whatsapp,
          nombreCliente: updatedOrder.buyer?.clientName,
          tiktokUsername: updatedOrder.buyer?.tiktokUsername,
        })
      }
    } catch (error) {
      console.error('Error emitiendo evento pedido:actualizado:', error)
    }

    if (confirmaPago) {
      try {
        for (const item of updatedOrder.orderItems) {
          await inventoryService.registerMovement({
            productId: item.productId,
            quantity: item.quantity,
            movementType: MovementType.OUT,
          })
        }

        await prisma.receipt.updateMany({
          where: { orderId: id },
          data: { validationStatus: 'VALIDATED' },
        })
      } catch (error: any) {
        // El pago ya está confirmado: solo queda regularizar el inventario,
        // y queda registrado en el log para corregirlo a mano.
        console.error(
          `Pedido #${id} pagado pero sin actualizar el inventario:`,
          error?.message || error,
        )
      }
    } else if (status === OrderStatus.REJECTED) {
      await prisma.receipt.updateMany({
        where: { orderId: id },
        data: { validationStatus: 'REJECTED' },
      })
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

    // El OCR solo extrae datos del comprobante. Toda la validacion vive en
    // receipt-validation.service: monto, referencia exacta del pedido y fecha
    // de la transaccion dentro de la ventana valida.
    const receiptData = extractReceiptData(recognizedText)

    // El texto reconocido se registra porque el OCR cambia su salida segun la
    // foto que manda el cliente (resolucion, angulo, si el banco parte una fila
    // en dos). Sin este log, un fallo de validacion no hay forma de
    // diagnosticarlo: solo se ve el dato mal leido, no lo que el banco escribio.
    console.log(
      `[OCR orden ${id}] texto reconocido:\n${JSON.stringify(recognizedText)}`,
    )
    console.log(
      `[OCR orden ${id}] extraido: referencia=${JSON.stringify(receiptData.reference)} usuario=${JSON.stringify(receiptData.tiktokUsername)} codigo=${JSON.stringify(receiptData.productCode)} monto=${receiptData.amount}`,
    )

    const expectedProductCode = order.orderItems[0]?.product?.code || ""
    const expectedTiktokUsername = order.buyer?.tiktokUsername || ""

    validateReceipt(receiptData, {
      id: order.id,
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
      productCode: expectedProductCode,
      tiktokUsername: expectedTiktokUsername,
    })


    // El OCR SOLO verifica informacion del comprobante (monto + referencia).
    // No debe modificar la identidad del comprador: el texto reconocido suele
    // venir corrupto (ej. "aues") y terminaba corrompiendo el nombre real.
    // Para notificar al cliente se usa buyer.tiktokUsername.

    const receipt = await prisma.receipt.create({
      data: {
        orderId: id,
        imageUrl: receiptUrl,
        extractedAmount: receiptData.amount,
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
