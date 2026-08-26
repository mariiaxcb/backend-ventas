import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { inventoryService } from '@/services/inventory.service'
import { sendSuccess } from '@/utils/response.util'
import { MovementType } from '@prisma/client'

const movementSchema = z.object({
  productId: z.number().int().positive('Product ID is required'),
  quantity: z.number().int().min(0, 'Quantity must be non-negative'),
  movementType: z.nativeEnum(MovementType),
})

export const inventoryController = {
  async listByProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = Number(req.params.productId)
      const history = await inventoryService.listByProduct(productId)
      return sendSuccess(
        res,
        history,
        'Inventory history retrieved successfully',
      )
    } catch (error) {
      next(error)
    }
  },

  async createMovement(req: Request, res: Response, next: NextFunction) {
    try {
      const input = movementSchema.parse(req.body)
      const movement = await inventoryService.registerMovement(input)
      return sendSuccess(
        res,
        movement,
        'Inventory movement recorded successfully',
        201,
      )
    } catch (error) {
      next(error)
    }
  },
}
