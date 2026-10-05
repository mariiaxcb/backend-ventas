import { prisma } from '@/config/database'
import { env } from '@/config/env.config'
import { AppError } from '@/middlewares/error.middleware'
import { StreamStatus } from '@prisma/client'

export interface CreateReservationInput {
  tiktokUsername: string
  productCode: string
  timestamp: string | Date
  comment?: string
}

/** Reserva vencida por falta de confirmación del comprador. */
export interface ReservationExpirada {
  id: number
  tiktokUsername: string
  productCode: string
  productName: string
  streamId: number
}

export const reservationService = {
  create: async (data: CreateReservationInput) => {
    const activeStream = await prisma.stream.findFirst({
      where: { status: StreamStatus.LIVE },
    })

    if (!activeStream) {
      throw new AppError(
        'No active live stream found to register reservation',
        400,
      )
    }

    const product = await prisma.product.findUnique({
      where: { code: data.productCode },
    })

    if (!product) {
      throw new AppError('Product not found with given code', 404)
    }

    return prisma.reservation.create({
      data: {
        tiktokUsername: data.tiktokUsername.trim(),
        productCode: data.productCode.trim(),
        timestamp: new Date(data.timestamp),
        streamId: activeStream.id,
        productId: product.id,
      },
      include: {
        product: true,
        stream: true,
      },
    })
  },

  listByActiveStream: async () => {
    const activeStream = await prisma.stream.findFirst({
      where: { status: StreamStatus.LIVE },
    })

    if (!activeStream) {
      throw new AppError('No active live stream found', 404)
    }

    return prisma.reservation.findMany({
      where: { streamId: activeStream.id, status: 'PENDING' },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            stock: true,
            price: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { timestamp: 'asc' },
    })
  },

  /**
   * Cancela las reservas PENDING que el comprador no confirmó a tiempo en
   * WhatsApp y devuelve las canceladas.
   *
   * Solo se vencen las reservas de transmisiones en vivo: al terminar el live
   * las reservas sin confirmar dejan de tener sentido y se conservan tal cual
   * para el historial.
   */
  expireStale: async (): Promise<ReservationExpirada[]> => {
    const ttlMs = env.RESERVATION_TTL_MINUTES * 60 * 1000
    const vencidoEn = new Date(Date.now() - ttlMs)

    const vencidas = await prisma.reservation.findMany({
      where: {
        status: 'PENDING',
        timestamp: { lt: vencidoEn },
        stream: { status: StreamStatus.LIVE },
      },
      include: { product: { select: { name: true } } },
    })

    if (vencidas.length === 0) return []

    // Actualizamos por id para no volver a tocar las que otro proceso cambió.
    const canceladas = await prisma.reservation.updateMany({
      where: { id: { in: vencidas.map((r) => r.id) }, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    })

    if (canceladas.count === 0) return []

    return vencidas.map((reserva) => ({
      id: reserva.id,
      tiktokUsername: reserva.tiktokUsername,
      productCode: reserva.productCode,
      productName: reserva.product.name,
      streamId: reserva.streamId,
    }))
  },
}
