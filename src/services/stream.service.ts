import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'
import { StreamStatus } from '@prisma/client'

export interface CreateStreamInput {
  title: string
  adminId: number
}

export const streamService = {
  list: () =>
    prisma.stream.findMany({
      include: {
        admin: {
          select: { id: true, username: true },
        },
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { id: 'desc' },
    }),

  getActive: () =>
    prisma.stream.findFirst({
      where: { status: StreamStatus.LIVE },
      include: {
        admin: {
          select: { id: true, username: true },
        },
        _count: {
          select: { orders: true },
        },
      },
    }),

  getById: async (id: number) => {
    const stream = await prisma.stream.findUnique({
      where: { id },
      include: {
        admin: {
          select: { id: true, username: true },
        },
        orders: {
          include: {
            buyer: true,
            orderItems: {
              include: { product: true },
            },
          },
        },
      },
    })
    if (!stream) throw new AppError('Stream not found', 404)
    return stream
  },

  create: async ({ title, adminId }: CreateStreamInput) => {
    const activeStream = await prisma.stream.findFirst({
      where: { status: StreamStatus.LIVE },
    })

    if (activeStream) {
      throw new AppError(
        'There is already an active LIVE stream. Please end it before starting a new one',
        400,
      )
    }

    return prisma.stream.create({
      data: {
        title,
        startDate: new Date(),
        status: StreamStatus.LIVE,
        adminId,
      },
      include: {
        admin: {
          select: { id: true, username: true },
        },
      },
    })
  },

  endStream: async (id: number) => {
    const stream = await streamService.getById(id)

    if (stream.status === StreamStatus.ENDED) {
      throw new AppError('Stream is already ended', 400)
    }

    return prisma.stream.update({
      where: { id },
      data: {
        status: StreamStatus.ENDED,
        endDate: new Date(),
      },
      include: {
        admin: {
          select: { id: true, username: true },
        },
      },
    })
  },
}
