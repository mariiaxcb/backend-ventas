import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { productoService } from '@/services/producto.service'

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  imageUrl: z.string().url().optional(),
  categoryId: z.number().int().positive('Category ID is required'),
})

const updateProductSchema = productSchema.partial()

export const productoController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await productoService.listar())
    } catch (error) {
      next(error)
    }
  },

  async obtener(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      res.json(await productoService.obtener(id))
    } catch (error) {
      next(error)
    }
  },

  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const input = productSchema.parse(req.body)
      res.status(201).json(await productoService.crear(input))
    } catch (error) {
      next(error)
    }
  },

  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const input = updateProductSchema.parse(req.body)
      res.json(await productoService.actualizar(id, input))
    } catch (error) {
      next(error)
    }
  },

  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      await productoService.eliminar(id)
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  },
}
