import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'
import { OrderStatus, ReceiptStatus, MovementType } from '@prisma/client'
import { inventoryService } from './inventory.service'

export interface UploadReceiptInput {
  orderId: number
  imageUrl: string
  extractedAmount?: number
}

export const receiptService = {
  upload: async ({
    orderId,
    imageUrl,
    extractedAmount,
  }: UploadReceiptInput) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      throw new AppError('Order not found', 404)
    }

    const receipt = await prisma.receipt.upsert({
      where: { orderId },
      update: {
        imageUrl,
        extractedAmount,
        validationStatus: ReceiptStatus.PENDING,
      },
      create: {
        orderId,
        imageUrl,
        extractedAmount,
        validationStatus: ReceiptStatus.PENDING,
      },
    })

    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.IN_REVIEW },
    })

    return receipt
  },

  getByOrderId: async (orderId: number) => {
    const receipt = await prisma.receipt.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            buyer: true,
            orderItems: {
              include: { product: true },
            },
          },
        },
      },
    })

    if (!receipt) {
      throw new AppError('Receipt not found for this order', 404)
    }

    return receipt
  },

  validateReceipt: async (orderId: number, status: ReceiptStatus) => {
    const receipt = await receiptService.getByOrderId(orderId)

    if (receipt.validationStatus === ReceiptStatus.VALIDATED) {
      throw new AppError('Receipt is already validated', 400)
    }

    if (status === ReceiptStatus.VALIDATED) {
      for (const item of receipt.order.orderItems) {
        await inventoryService.registerMovement({
          productId: item.productId,
          quantity: item.quantity,
          movementType: MovementType.OUT,
        })
      }

      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID },
      })
    } else if (status === ReceiptStatus.REJECTED) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.REJECTED },
      })
    }

    return prisma.receipt.update({
      where: { orderId },
      data: { validationStatus: status },
      include: { order: true },
    })
  },
}
