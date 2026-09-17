import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { orderService } from '@/services/order.service'
import { sendSuccess } from '@/utils/response.util'
import { OrderStatus } from '@prisma/client'
import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

const createOrderSchema = z.object({
  clientName: z.string().min(1),
  whatsapp: z.string().min(1),
  tiktokUsername: z.string().optional(),
  streamId: z.number().int().positive().optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
})

const listOrdersQuerySchema = z.object({
  streamId: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  buyerId: z.coerce.number().int().positive().optional(),
})

const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
})

export const orderController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = listOrdersQuerySchema.parse(req.query)
      const orders = await orderService.list(filters)
      return sendSuccess(res, orders)
    } catch (error) {
      next(error)
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const order = await orderService.getById(id)
      return sendSuccess(res, order)
    } catch (error) {
      next(error)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createOrderSchema.parse(req.body)
      const order = await orderService.create(input)
      return sendSuccess(res, order, undefined, 201)
    } catch (error) {
      next(error)
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const { status } = updateStatusSchema.parse(req.body)
      const order = await orderService.updateStatus(id, status)
      return sendSuccess(res, order)
    } catch (error) {
      next(error)
    }
  },

  async generateQr(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const order = await orderService.generateQr(id)
      return sendSuccess(res, order)
    } catch (error) {
      next(error)
    }
  },

  async syncPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const order = await orderService.syncPayment(id)
      return sendSuccess(res, order)
    } catch (error) {
      next(error)
    }
  },

  async uploadReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: 'Receipt image is required' })
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'tiktok-live-receipts',
      })
      const receiptUrl = result.secure_url

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }

      const order = await orderService.processReceiptOCR(id, receiptUrl)

      return sendSuccess(res, order)
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      next(error)
    }
  },
}
