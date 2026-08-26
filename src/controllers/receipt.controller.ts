import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { receiptService } from '@/services/receipt.service'
import { sendSuccess } from '@/utils/response.util'
import { AppError } from '@/middlewares/error.middleware'
import { ReceiptStatus } from '@prisma/client'

const uploadParamsSchema = z.object({
  orderId: z.coerce.number().int().positive('Valid Order ID is required'),
})

const validateReceiptSchema = z.object({
  status: z.nativeEnum(ReceiptStatus),
})

export const receiptController = {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = uploadParamsSchema.parse(req.params)

      if (!req.file) {
        throw new AppError('Receipt image file is required', 400)
      }

      const receipt = await receiptService.upload({
        orderId,
        imageUrl: req.file.path,
        extractedAmount: req.body.extractedAmount
          ? Number(req.body.extractedAmount)
          : undefined,
      })

      return sendSuccess(
        res,
        receipt,
        'Receipt uploaded successfully and order moved to IN_REVIEW',
        201,
      )
    } catch (error) {
      next(error)
    }
  },

  async getByOrderId(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = uploadParamsSchema.parse(req.params)
      const receipt = await receiptService.getByOrderId(orderId)
      return sendSuccess(res, receipt, 'Receipt retrieved successfully')
    } catch (error) {
      next(error)
    }
  },

  async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = uploadParamsSchema.parse(req.params)
      const { status } = validateReceiptSchema.parse(req.body)
      const receipt = await receiptService.validateReceipt(orderId, status)
      return sendSuccess(
        res,
        receipt,
        `Receipt marked as ${status} successfully`,
      )
    } catch (error) {
      next(error)
    }
  },
}
