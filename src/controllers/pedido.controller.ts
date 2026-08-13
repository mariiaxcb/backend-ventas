import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { pedidoService } from '@/services/pedido.service'
import {
  emitirPedidoNuevo,
  emitirPedidoActualizado,
} from '@/websockets/events/pedido.event'
import { OrderStatus } from '@prisma/client'

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
})

const createOrderSchema = z.object({
  buyerId: z.number().int().positive(),
  streamId: z.number().int().positive(),
  totalPrice: z.number().positive(),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
})

const validateOrderSchema = z.object({
  status: z.nativeEnum(OrderStatus),
})

export const pedidoController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as OrderStatus | undefined
      res.json(await pedidoService.listar(status))
    } catch (error) {
      next(error)
    }
  },

  async obtener(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      res.json(await pedidoService.obtener(id))
    } catch (error) {
      next(error)
    }
  },

  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createOrderSchema.parse(req.body)
      const order = await pedidoService.crear(input)
      emitirPedidoNuevo(order)
      res.status(201).json(order)
    } catch (error) {
      next(error)
    }
  },

  async validar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const { status } = validateOrderSchema.parse(req.body)
      const order = await pedidoService.validar({
        orderId: id,
        status,
      })
      emitirPedidoActualizado(order)
      res.json(order)
    } catch (error) {
      next(error)
    }
  },
}
