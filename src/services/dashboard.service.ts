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

  /**
   * Resumen de una transmision para mostrar al vendedor al finalizarla.
   *
   * Si no se indica streamId se usa la transmision activa. Si la transmision
   * sigue en vivo, la duracion se calcula hasta el momento de la consulta.
   */
  getSummary: async (streamId?: number) => {
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
      include: { products: true },
    })

    if (!stream) {
      throw new AppError('Stream not found', 404)
    }

    const [
      revenueAggregation,
      ordersByStatus,
      reservers,
      canceladas,
      itemsSold,
      ordenes,
    ] = await Promise.all([
        prisma.order.aggregate({
          where: {
            streamId: targetStreamId,
            status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] },
          },
          _sum: { totalPrice: true },
        }),
        prisma.order.groupBy({
          by: ['status'],
          where: { streamId: targetStreamId },
          _count: { _all: true },
        }),
        // Cada persona cuenta una sola vez, aunque haya reservado varias veces.
        prisma.reservation.findMany({
          where: { streamId: targetStreamId },
          select: { tiktokUsername: true },
          distinct: ['tiktokUsername'],
        }),
        // Reservas que el comprador no confirmó a tiempo. Se cuentan por
        // usuario para no inflar el dato si alguien reserve varias veces.
        prisma.reservation.findMany({
          where: { streamId: targetStreamId, status: 'CANCELLED' },
          select: { tiktokUsername: true },
          distinct: ['tiktokUsername'],
        }),
        prisma.orderItem.groupBy({
          by: ['productId'],
          where: {
            order: {
              streamId: targetStreamId,
              status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED] },
            },
          },
          _sum: { quantity: true },
        }),
        // Detalle de cada orden del live, con el comprobante para que el
        // vendedor pueda abrirlo y decidir sin salir del resumen.
        prisma.order.findMany({
          where: { streamId: targetStreamId },
          orderBy: { createdAt: 'desc' },
          include: {
            buyer: { select: { tiktokUsername: true, clientName: true } },
            orderItems: {
              include: {
                product: {
                  select: { id: true, name: true, code: true, imageUrl: true },
                },
              },
            },
            receipt: {
              select: {
                imageUrl: true,
                extractedAmount: true,
                validationStatus: true,
              },
            },
          },
        }),
      ])

    const soldByProduct = new Map(
      itemsSold.map((item) => [item.productId, item._sum.quantity ?? 0]),
    )

    const countOrdersWithStatus = (status: OrderStatus) =>
      ordersByStatus.find((o) => o.status === status)?._count._all ?? 0

    const totalSales =
      countOrdersWithStatus(OrderStatus.PAID) +
      countOrdersWithStatus(OrderStatus.DELIVERED)

    // Si la transmision continua en vivo, la duracion llega hasta ahora.
    const effectiveEndDate = stream.endDate ?? new Date()
    const durationMs =
      effectiveEndDate.getTime() - new Date(stream.startDate).getTime()

    return {
      streamId: stream.id,
      title: stream.title,
      tiktokUsername: stream.tiktokUsername,
      status: stream.status,
      startDate: stream.startDate,
      endDate: stream.endDate,
      durationMs,
      // Personas distintas que dejaron una reserva en el live.
      reservationsTotal: reservers.length,
      // Personas cuya reserva se venció sin confirmar por WhatsApp.
      cancelledReservations: canceladas.length,
      totalSales,
      totalRevenue: revenueAggregation._sum.totalPrice ?? 0,
      ordersSummary: ordersByStatus.map((o) => ({
        status: o.status,
        count: o._count._all,
      })),
      orders: ordenes.map((order) => ({
        id: order.id,
        status: order.status,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
        tiktokUsername: order.buyer.tiktokUsername,
        clientName: order.buyer.clientName,
        items: order.orderItems.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          product: item.product,
        })),
        receipt: order.receipt,
      })),
      products: stream.products.map((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        stock: product.stock,
        sold: soldByProduct.get(product.id) ?? 0,
      })),
    }
  },
}
