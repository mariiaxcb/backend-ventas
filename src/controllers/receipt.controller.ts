import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { receiptService } from '@/services/receipt.service'
import { sendSuccess } from '@/utils/response.util'
import { AppError } from '@/middlewares/error.middleware'

const uploadParamsSchema = z.object({
  orderId: z.coerce.number().int().positive('Valid Order ID is required'),
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
}
