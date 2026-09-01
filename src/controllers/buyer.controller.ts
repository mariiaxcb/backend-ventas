import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { buyerService } from '@/services/buyer.service'
import { sendSuccess } from '@/utils/response.util'

const listQuerySchema = z.object({
  search: z.string().optional(),
})

export const buyerController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = listQuerySchema.parse(req.query)
      const buyers = await buyerService.list(filters)
      return sendSuccess(res, buyers, 'Buyers retrieved successfully')
    } catch (error) {
      next(error)
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const buyer = await buyerService.getById(id)
      return sendSuccess(res, buyer, 'Buyer retrieved successfully')
    } catch (error) {
      next(error)
    }
  },
}
