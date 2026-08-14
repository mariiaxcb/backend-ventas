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
      const bodyData = {
        ...req.body,
        price: req.body.price ? Number(req.body.price) : undefined,
        stock: req.body.stock ? Number(req.body.stock) : undefined,
        categoryId: req.body.categoryId
          ? Number(req.body.categoryId)
          : undefined,
        ...(req.file && { imageUrl: req.file.path }),
      }

      const input = productSchema.parse(bodyData)
      res.status(201).json(await productoService.crear(input))
    } catch (error) {
      next(error)
    }
  },

  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const bodyData = {
        ...req.body,
        ...(req.body.price && { price: Number(req.body.price) }),
        ...(req.body.stock && { stock: Number(req.body.stock) }),
        ...(req.body.categoryId && { categoryId: Number(req.body.categoryId) }),
        ...(req.file && { imageUrl: req.file.path }),
      }

      const input = updateProductSchema.parse(bodyData)
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
