import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { reservationService } from '@/services/reservation.service'
import { sendSuccess } from '@/utils/response.util'

const createReservationSchema = z.object({
  tiktokUsername: z.string().min(1, 'TikTok username is required'),
  productCode: z.string().min(1, 'Product code is required'),
  timestamp: z.union([z.string(), z.date()]),
  comment: z.string().optional(),
})

export const reservationController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createReservationSchema.parse(req.body)
      const reservation = await reservationService.create(input)
      return sendSuccess(
        res,
        reservation,
        'Reservation registered successfully',
        201,
      )
    } catch (error) {
      next(error)
    }
  },

  async listByStream(req: Request, res: Response, next: NextFunction) {
    try {
      const streamId = Number(req.params.streamId)
      const reservations = await reservationService.listByStream(streamId)
      return sendSuccess(res, reservations, 'Reservations retrieved successfully')
    } catch (error) {
      next(error)
    }
  },
}
