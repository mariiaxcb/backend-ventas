// src/controllers/stream.controller.ts
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { streamService } from '@/services/stream.service'
import { sendSuccess } from '@/utils/response.util'

const createStreamSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  tiktokUsername: z.string().min(1, 'TikTok Username is required'),
})

const manageProductSchema = z.object({
  productCode: z.string().min(1, 'Product code is required'),
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
      const stream = await streamService.getActive()
      if (!stream) return sendSuccess(res, null, 'No active stream found')
      return sendSuccess(res, stream, 'Active stream retrieved successfully')
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
      const { title, tiktokUsername } = createStreamSchema.parse(req.body)
      const adminId = Number((req as any).usuario.id)
      const stream = await streamService.create({
        title,
        tiktokUsername,
        adminId,
      })
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

  async addProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const { productCode } = manageProductSchema.parse(req.body)
      const stream = await streamService.addProduct(id, productCode)
      return sendSuccess(res, stream, 'Product added to stream successfully')
    } catch (error) {
      next(error)
    }
  },

  async removeProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const productCode = req.params.productCode
      const stream = await streamService.removeProduct(id, productCode)
      return sendSuccess(
        res,
        stream,
        'Product removed from stream successfully',
      )
    } catch (error) {
      next(error)
    }
  },
}
