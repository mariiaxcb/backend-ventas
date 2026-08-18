import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { orderService } from '@/services/order.service'
import { sendSuccess } from '@/utils/response.util'
import { OrderStatus } from '@prisma/client'

const createOrderSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  whatsapp: z.string().min(1, 'WhatsApp number is required'),
  tiktokUsername: z.string().optional(),
  streamId: z.number().int().positive().optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive('Product ID is required'),
        quantity: z.number().int().positive('Quantity must be greater than 0'),
      }),
    )
    .min(1, 'At least one product item is required'),
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
      return sendSuccess(res, orders, 'Orders retrieved successfully')
    } catch (error) {
      next(error)
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const order = await orderService.getById(id)
      return sendSuccess(res, order, 'Order retrieved successfully')
    } catch (error) {
      next(error)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createOrderSchema.parse(req.body)
      const order = await orderService.create(input)
      return sendSuccess(res, order, 'Order created successfully', 201)
    } catch (error) {
      next(error)
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const { status } = updateStatusSchema.parse(req.body)
      const order = await orderService.updateStatus(id, status)
      return sendSuccess(res, order, 'Order status updated successfully')
    } catch (error) {
      next(error)
    }
  },
}
