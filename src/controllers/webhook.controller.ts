import type { Request, Response, NextFunction } from 'express'
import { canelaBankService } from '@/services/canela-bank.service'
import { sendSuccess } from '@/utils/response.util'
import { prisma } from '@/config/database'
import { inventoryService } from '@/services/inventory.service'
import { OrderStatus, MovementType } from '@prisma/client'

export const webhookController = {
  async handleCanelaPay(req: Request, res: Response, next: NextFunction) {
    try {
      const signatureHeader = req.headers['x-canela-signature'] as string

      if (!signatureHeader) {
        return res
          .status(401)
          .json({
            success: false,
            message: 'Missing x-canela-signature header',
          })
      }

      const isValid = canelaBankService.verifySignature(
        req.body,
        signatureHeader,
      )

      if (!isValid) {
        return res
          .status(401)
          .json({ success: false, message: 'Invalid webhook signature' })
      }

      const { aliasRef, status, id: transactionId } = req.body

      if (status === 'PAID') {
        const order = await prisma.order.findFirst({
          where: { qrId: aliasRef },
          include: { orderItems: true },
        })

        if (order && order.status !== OrderStatus.PAID) {
          for (const item of order.orderItems) {
            await inventoryService.registerMovement({
              productId: item.productId,
              quantity: item.quantity,
              movementType: MovementType.OUT,
            })
          }

          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.PAID,
              transactionId: transactionId,
            },
          })
        }
      }

      return sendSuccess(
        res,
        { received: true },
        'Webhook processed successfully',
      )
    } catch (error) {
      next(error)
    }
  },
}
