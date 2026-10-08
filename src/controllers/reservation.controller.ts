import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { reservationService } from '@/services/reservation.service'
import { AppError } from '@/middlewares/error.middleware'
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

  async listByActiveStream(_req: Request, res: Response, next: NextFunction) {
    try {
      const reservations = await reservationService.listByActiveStream()
      return sendSuccess(
        res,
        reservations,
        'Reservations retrieved successfully',
      )
    } catch (error) {
      next(error)
    }
  },

  /**
   * Cancela una reserva por id.
   *
   * Es lo que usa el bot cuando el cliente escribe "Cancelar Reserva". Se
   * emite `reserva:cancelada` para que el panel del vendedor se entere al
   * instante, igual que ocurre con los pagos validados.
   */
  async cancelById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)

      if (!Number.isInteger(id) || id <= 0) {
        throw new AppError('El id de la reserva no es valido', 400)
      }

      const { orderId } = await reservationService.cancelById(id)

      try {
        const { getIO } = await import('@/websockets/socket.server')

        getIO().emit('reserva:cancelada', {
          reservaId: id,
          orderId,
          canceladoPor: 'cliente',
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        // Si el socket no está montado, la reserva ya quedó cancelada en la
        // base. Perder la notificación no debe deshacer eso.
        console.error(
          'No se pudo emitir reserva:cancelada:',
          error instanceof Error ? error.message : error,
        )
      }

      return sendSuccess(res, { id, orderId }, 'Reservation cancelled')
    } catch (error) {
      next(error)
    }
  },

  /**
   * Busca la reserva pendiente de un comprador por su usuario de TikTok.
   *
   * El bot la consulta antes de cancelar, para poder decirle al cliente qué
   * reserva se está cancelando.
   */
  async findPendingByUsername(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { username } = z
        .object({ username: z.string().min(1, 'username is required') })
        .parse(req.query)

      const reserva = await reservationService.findPendingByUsername(username)

      return sendSuccess(res, reserva, 'Reservation lookup completed')
    } catch (error) {
      next(error)
    }
  },
}
