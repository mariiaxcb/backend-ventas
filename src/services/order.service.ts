import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'
import { OrderStatus, StreamStatus } from '@prisma/client'

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

      const itemTotal = Number(product.price) * item.quantity
      calculatedTotal += itemTotal

      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
      }
    })

    return prisma.order.create({
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
        orderItems: {
          include: { product: true },
        },
      },
    })
  },

  updateStatus: async (id: number, status: OrderStatus) => {
    await orderService.getById(id)

    return prisma.order.update({
      where: { id },
      data: { status },
      include: {
        buyer: true,
        stream: true,
        orderItems: {
          include: { product: true },
        },
        receipt: true,
      },
    })
  },
}
