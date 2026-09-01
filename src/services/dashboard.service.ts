import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'
import { OrderStatus, StreamStatus } from '@prisma/client'

export const dashboardService = {
  getStreamMetrics: async (streamId?: number) => {
    let targetStreamId = streamId

    if (!targetStreamId) {
      const activeStream = await prisma.stream.findFirst({
        where: { status: StreamStatus.LIVE },
      })
      if (!activeStream) {
        throw new AppError(
          'No active stream found and no streamId provided',
          404,
        )
      }
      targetStreamId = activeStream.id
    }

    const stream = await prisma.stream.findUnique({
      where: { id: targetStreamId },
    })

    if (!stream) {
      throw new AppError('Stream not found', 404)
    }

    const revenueAggregation = await prisma.order.aggregate({
      where: {
        streamId: targetStreamId,
        status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] },
      },
      _sum: { totalPrice: true },
    })
    const totalRevenue = revenueAggregation._sum.totalPrice || 0

    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      where: { streamId: targetStreamId },
      _count: { _all: true },
    })

    const uniqueBuyers = await prisma.order.findMany({
      where: { streamId: targetStreamId },
      select: { buyerId: true },
      distinct: ['buyerId'],
    })

    const topProductsRaw = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          streamId: targetStreamId,
          status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    })

    const productIds = topProductsRaw.map((p) => p.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true, imageUrl: true },
    })

    const topProducts = topProductsRaw.map((raw) => ({
      ...products.find((p) => p.id === raw.productId),
      totalSold: raw._sum.quantity || 0,
    }))

    return {
      streamId: stream.id,
      title: stream.title,
      status: stream.status,
      totalRevenue,
      totalUniqueBuyers: uniqueBuyers.length,
      ordersSummary: ordersByStatus.map((o) => ({
        status: o.status,
        count: o._count._all,
      })),
      topProducts,
    }
  },
}
