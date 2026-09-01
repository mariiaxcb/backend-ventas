import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { dashboardService } from '@/services/dashboard.service'
import { sendSuccess } from '@/utils/response.util'

const querySchema = z.object({
  streamId: z.coerce.number().int().positive().optional(),
})

export const dashboardController = {
  async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { streamId } = querySchema.parse(req.query)
      const metrics = await dashboardService.getStreamMetrics(streamId)
      return sendSuccess(res, metrics, 'Stream metrics retrieved successfully')
    } catch (error) {
      next(error)
    }
  },
}
