import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'
import { MovementType, ProductStatus } from '@prisma/client'

export interface CreateMovementInput {
  productId: number
  quantity: number
  movementType: MovementType
}

export const inventoryService = {
  listByProduct: async (productId: number) => {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      throw new AppError('Product not found', 404)
    }

    return prisma.inventoryHistory.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, name: true, stock: true },
        },
      },
    })
  },

  registerMovement: async ({
    productId,
    quantity,
    movementType,
  }: CreateMovementInput) => {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      throw new AppError('Product not found', 404)
    }

    let newStock = product.stock

    if (movementType === MovementType.IN) {
      newStock += quantity
    } else if (movementType === MovementType.OUT) {
      if (product.stock < quantity) {
        throw new AppError(
          `Insufficient stock for product ${product.name}`,
          400,
        )
      }
      newStock -= quantity
    } else if (movementType === MovementType.ADJUSTMENT) {
      newStock = quantity
    }

    const newStatus =
      newStock === 0
        ? ProductStatus.OUT_OF_STOCK
        : product.status === ProductStatus.OUT_OF_STOCK
          ? ProductStatus.ACTIVE
          : product.status

    const [history] = await prisma.$transaction([
      prisma.inventoryHistory.create({
        data: {
          productId,
          quantity,
          movementType,
        },
      }),
      prisma.product.update({
        where: { id: productId },
        data: {
          stock: newStock,
          status: newStatus,
        },
      }),
    ])

    return history
  },
}
