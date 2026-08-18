import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'
import { productService } from './product.service'
import { OrderStatus } from '@prisma/client'

export interface CreateOrderItemInput {
  productId: number
  quantity: number
  unitPrice: number
}

export interface CreateOrderInput {
  buyerId: number
  streamId: number
  totalPrice: number
  items: CreateOrderItemInput[]
}

export interface ValidateOrderInput {
  orderId: number
  status: OrderStatus
}

export const pedidoService = {
  listar: (status?: OrderStatus) =>
    prisma.order.findMany({
      where: status ? { status } : undefined,
      include: {
        buyer: true,
        stream: true,
        orderItems: {
          include: { product: true },
        },
        receipt: true,
      },
      orderBy: { id: 'desc' },
    }),

  obtener: async (id: number) => {
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

  crear: async ({ buyerId, streamId, totalPrice, items }: CreateOrderInput) => {
    return prisma.order.create({
      data: {
        buyerId,
        streamId,
        totalPrice,
        status: 'PENDING',
        orderItems: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: {
        buyer: true,
        orderItems: {
          include: { product: true },
        },
      },
    })
  },

  validar: async ({ orderId, status }: ValidateOrderInput) => {
    const order = await pedidoService.obtener(orderId)

    if (status === 'PAID') {
      for (const item of order.orderItems) {
        await productService.decreaseStock(item.productId, item.quantity)
      }
    }

    return prisma.order.update({
      where: { id: orderId },
      data: { status },
    })
  },
}
