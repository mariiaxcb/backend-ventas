import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { productService } from '@/services/product.service'
import { sendSuccess } from '@/utils/response.util'
import { ProductStatus } from '@prisma/client'

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  imageUrl: z.string().url().optional(),
  categoryName: z.string().min(1, 'Category name is required'),
})

const updateProductSchema = productSchema.partial().extend({
  status: z.nativeEnum(ProductStatus).optional(),
})

const listQuerySchema = z.object({
  status: z.nativeEnum(ProductStatus).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  inStock: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
})

export const productController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = listQuerySchema.parse(req.query)
      const products = await productService.list(filters)
      return sendSuccess(res, products, 'Products retrieved successfully')
    } catch (error) {
      next(error)
    }
  },

  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await productService.getCategories()
      return sendSuccess(res, categories, 'Categories retrieved successfully')
    } catch (error) {
      next(error)
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const product = await productService.getById(id)
      return sendSuccess(res, product, 'Product retrieved successfully')
    } catch (error) {
      next(error)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const bodyData = {
        ...req.body,
        price: req.body.price ? Number(req.body.price) : undefined,
        stock: req.body.stock ? Number(req.body.stock) : undefined,
        categoryName: req.body.categoryName,
        ...(req.file && { imageUrl: req.file.path }),
      }

      const input = productSchema.parse(bodyData)
      const product = await productService.create(input)
      return sendSuccess(res, product, 'Product created successfully', 201)
    } catch (error) {
      next(error)
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const bodyData = {
        ...req.body,
        ...(req.body.price !== undefined && { price: Number(req.body.price) }),
        ...(req.body.stock !== undefined && { stock: Number(req.body.stock) }),
        ...(req.body.categoryName !== undefined && {
          categoryName: req.body.categoryName,
        }),
        ...(req.body.status !== undefined && { status: req.body.status }),
        ...(req.file && { imageUrl: req.file.path }),
      }

      const input = updateProductSchema.parse(bodyData)
      const product = await productService.update(id, input)
      return sendSuccess(res, product, 'Product updated successfully')
    } catch (error) {
      next(error)
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      await productService.delete(id)
      return sendSuccess(res, null, 'Product deleted successfully')
    } catch (error) {
      next(error)
    }
  },
}
