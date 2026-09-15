import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'
import { StreamStatus } from '@prisma/client'

export interface CreateStreamInput {
  title: string
  tiktokUsername: string
  adminId: number
}

export const streamService = {
  list: () => {
    return prisma.stream.findMany({
      include: {
        _count: {
          select: { orders: true },
        },
        products: true,
      },
      orderBy: { id: 'desc' },
    })
  },

  getActive: () => {
    return prisma.stream.findFirst({
      where: { status: StreamStatus.LIVE },
      include: {
        admin: {
          select: { id: true, username: true },
        },
        _count: {
          select: { orders: true },
        },
        products: true,
      },
    })
  },

  getById: async (id: number) => {
    const stream = await prisma.stream.findUnique({
      where: { id },
      include: { products: true },
    })
    if (!stream) throw new AppError('Stream not found', 404)
    return stream
  },

  create: async (data: CreateStreamInput) => {
    const activeStream = await prisma.stream.findFirst({
      where: { status: StreamStatus.LIVE },
    })
    if (activeStream)
      throw new AppError('There is already an active live stream', 400)
    return prisma.stream.create({
      data,
      include: {
        admin: {
          select: { id: true, username: true },
        },
        products: true,
      },
    })
  },

  endStream: async (id: number) => {
    const stream = await streamService.getById(id)
    if (stream.status === StreamStatus.ENDED)
      throw new AppError('Stream is already ended', 400)
    return prisma.stream.update({
      where: { id },
      data: { status: StreamStatus.ENDED, endDate: new Date() },
    })
  },

  addProduct: async (streamId: number, productCode: string) => {
    const stream = await streamService.getById(streamId)
    if (stream.status !== StreamStatus.LIVE)
      throw new AppError('Stream is not live', 400)

    const product = await prisma.product.findUnique({
      where: { code: productCode },
    })
    if (!product) throw new AppError('Product not found with given code', 404)

    return prisma.stream.update({
      where: { id: streamId },
      data: {
        products: {
          connect: { id: product.id },
        },
      },
      include: { products: true },
    })
  },

  removeProduct: async (streamId: number, productCode: string) => {
    const stream = await streamService.getById(streamId)

    const product = await prisma.product.findUnique({
      where: { code: productCode },
    })
    if (!product) throw new AppError('Product not found with given code', 404)

    return prisma.stream.update({
      where: { id: streamId },
      data: {
        products: {
          disconnect: { id: product.id },
        },
      },
      include: { products: true },
    })
  },
}
