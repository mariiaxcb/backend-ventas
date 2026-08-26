import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'
import { MessageStatus } from '@prisma/client'

export interface CreateMessageInput {
  orderId: number
  content: string
  status?: MessageStatus
}

export const messageService = {
  create: async ({
    orderId,
    content,
    status = MessageStatus.SENT,
  }: CreateMessageInput) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      throw new AppError('Order not found', 404)
    }

    return prisma.message.create({
      data: {
        orderId,
        content: content.trim(),
        status,
      },
      include: {
        order: {
          select: {
            id: true,
            totalPrice: true,
            status: true,
            buyer: true,
          },
        },
      },
    })
  },

  listByOrder: async (orderId: number) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      throw new AppError('Order not found', 404)
    }

    return prisma.message.findMany({
      where: { orderId },
      orderBy: { id: 'asc' },
    })
  },

  updateStatus: async (id: number, status: MessageStatus) => {
    const message = await prisma.message.findUnique({
      where: { id },
    })

    if (!message) {
      throw new AppError('Message not found', 404)
    }

    return prisma.message.update({
      where: { id },
      data: { status },
    })
  },
}
