import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { streamService } from '@/services/stream.service'
import { sendSuccess } from '@/utils/response.util'
import { AppError } from '@/middlewares/error.middleware'

const createStreamSchema = z.object({
  title: z.string().min(1, 'Stream title is required'),
})

export const streamController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const streams = await streamService.list()
      return sendSuccess(res, streams, 'Streams retrieved successfully')
    } catch (error) {
      next(error)
    }
  },

  async getActive(req: Request, res: Response, next: NextFunction) {
    try {
      const activeStream = await streamService.getActive()
      return sendSuccess(
        res,
        activeStream,
        'Active stream retrieved successfully',
      )
    } catch (error) {
      next(error)
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const stream = await streamService.getById(id)
      return sendSuccess(res, stream, 'Stream retrieved successfully')
    } catch (error) {
      next(error)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user?.id
      if (!adminId) throw new AppError('Unauthorized', 401)

      const { title } = createStreamSchema.parse(req.body)
      const stream = await streamService.create({ title, adminId })
      return sendSuccess(res, stream, 'Live stream started successfully', 201)
    } catch (error) {
      next(error)
    }
  },

  async endStream(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const stream = await streamService.endStream(id)
      return sendSuccess(res, stream, 'Live stream ended successfully')
    } catch (error) {
      next(error)
    }
  },
}
