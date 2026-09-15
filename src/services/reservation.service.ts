import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'
import { StreamStatus } from '@prisma/client'

export interface CreateReservationInput {
  tiktokUsername: string
  productCode: string
  timestamp: string | Date
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
}
