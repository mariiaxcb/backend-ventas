import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'

export interface BuyerFilters {
  search?: string
}

export const buyerService = {
  list: (filters?: BuyerFilters) => {
    const where: any = {}

    if (filters?.search) {
      where.OR = [
        { clientName: { contains: filters.search, mode: 'insensitive' } },
        { whatsapp: { contains: filters.search } },
        { tiktokUsername: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    return prisma.buyer.findMany({
      where,
      include: {
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { id: 'desc' },
    })
  },

  getById: async (id: number) => {
    const buyer = await prisma.buyer.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            stream: { select: { title: true } },
            orderItems: { include: { product: true } },
          },
          orderBy: { id: 'desc' },
        },
      },
    })

    if (!buyer) {
      throw new AppError('Buyer not found', 404)
    }

    return buyer
  },
}
