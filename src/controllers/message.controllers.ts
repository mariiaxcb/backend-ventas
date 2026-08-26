import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { messageService } from '@/services/message.service'
import { sendSuccess } from '@/utils/response.util'
import { MessageStatus } from '@prisma/client'

const createMessageSchema = z.object({
  orderId: z.number().int().positive('Order ID is required'),
  content: z.string().min(1, 'Message content cannot be empty'),
  status: z.nativeEnum(MessageStatus).optional(),
})

const updateStatusSchema = z.object({
  status: z.nativeEnum(MessageStatus),
})

export const messageController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createMessageSchema.parse(req.body)
      const message = await messageService.create(input)
      return sendSuccess(res, message, 'Message saved successfully', 201)
    } catch (error) {
      next(error)
    }
  },

  async listByOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = Number(req.params.orderId)
      const messages = await messageService.listByOrder(orderId)
      return sendSuccess(res, messages, 'Messages retrieved successfully')
    } catch (error) {
      next(error)
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const { status } = updateStatusSchema.parse(req.body)
      const message = await messageService.updateStatus(id, status)
      return sendSuccess(res, message, 'Message status updated successfully')
    } catch (error) {
      next(error)
    }
  },
}
