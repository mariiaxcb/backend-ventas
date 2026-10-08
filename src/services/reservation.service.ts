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
   * Cancela una reserva a pedido del comprador.
   *
   * Cuando la reserva ya tiene una orden asociada, se cancela también la orden:
   * el cliente pidió dejar atrás la compra, y dejar la orden PENDING obliga al
   * job de expiración a gastarse una notificación inútil.
   *
   * Solo se toca la reserva indicada y solo si sigue PENDING: el filtro por
   * estado evita que una reserva ya cobrada o ya vencida se revierta desde el
   * chat.
   */
  cancelById: async (
    id: number,
  ): Promise<{ orderId: number | null }> => {
    const reserva = await prisma.reservation.findUnique({
      where: { id },
      include: { order: { select: { id: true, status: true } } },
    })

    if (!reserva) {
      throw new AppError('La reserva no existe', 404)
    }

    if (reserva.status !== 'PENDING') {
      throw new AppError(
        'La reserva ya no esta pendiente, no se puede cancelar',
        400,
      )
    }

    let orderId: number | null = null

    if (reserva.orderId) {
      const orden = await prisma.order.findUnique({
        where: { id: reserva.orderId },
        select: { id: true, status: true },
      })

      // Una orden ya cobrada no se toca: el cliente pago y el vendedor la
      // valido, asi que cancelar la reserva seria reportar una venta perdida.
      const ordenCancelable =
        orden && (orden.status === 'PENDING' || orden.status === 'IN_REVIEW')

      if (ordenCancelable) {
        await prisma.order.update({
          where: { id: orden.id },
          data: { status: 'CANCELLED' },
        })
        orderId = orden.id
      }
    }

    await prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    return { orderId }
  },

  /**
   * Busca la reserva PENDING de un comprador por su usuario de TikTok.
   *
   * El bot la usa para "Cancelar Reserva": el cliente no conoce el id de la
   * reserva, solo el usuario con el que reservo.
   */
  findPendingByUsername: async (
    tiktokUsername: string,
  ): Promise<{
    id: number
    tiktokUsername: string
    productCode: string
    productName: string
    streamId: number
    orderId: number | null
  } | null> => {
    const normalizado = tiktokUsername.trim().toLowerCase().replace(/^@/, '')

    if (!normalizado) return null

    const reserva = await prisma.reservation.findFirst({
      where: {
        status: 'PENDING',
        tiktokUsername: { equals: normalizado, mode: 'insensitive' },
      },
      orderBy: { timestamp: 'desc' },
      include: { product: { select: { name: true } } },
    })

    if (!reserva) return null

    return {
      id: reserva.id,
      tiktokUsername: reserva.tiktokUsername,
      productCode: reserva.productCode,
      productName: reserva.product.name,
      streamId: reserva.streamId,
      orderId: reserva.orderId,
    }
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
