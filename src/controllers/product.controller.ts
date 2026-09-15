import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { productService } from '@/services/product.service'
import { sendSuccess } from '@/utils/response.util'
import { ProductStatus } from '@prisma/client'
import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

const productSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  imageUrl: z.string().url().optional(),
  categoryName: z.string().min(1),
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
      return sendSuccess(res, products)
    } catch (error) {
      next(error)
    }
  },

  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await productService.getCategories()
      return sendSuccess(res, categories)
    } catch (error) {
      next(error)
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const product = await productService.getById(id)
      return sendSuccess(res, product)
    } catch (error) {
      next(error)
    }
  },

  async checkCode(req: Request, res: Response, next: NextFunction) {
    try {
      const code = String(req.query.code || '').trim()
      if (!code) {
        return sendSuccess(res, { exists: false })
      }
      const exists = await productService.checkCodeExists(code)
      return sendSuccess(res, { exists })
    } catch (error) {
      next(error)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      let uploadedImageUrl: string | undefined = undefined

      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'tiktok-live-products',
        })
        uploadedImageUrl = result.secure_url
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path)
        }
      }

      const bodyData = {
        ...req.body,
        price: req.body.price ? Number(req.body.price) : undefined,
        stock: req.body.stock ? Number(req.body.stock) : undefined,
        categoryName: req.body.categoryName,
        code: req.body.code,
        ...(uploadedImageUrl && { imageUrl: uploadedImageUrl }),
      }

      const input = productSchema.parse(bodyData)
      const product = await productService.create(input)
      return sendSuccess(res, product, undefined, 201)
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      next(error)
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      let uploadedImageUrl: string | undefined = undefined

      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'tiktok-live-products',
        })
        uploadedImageUrl = result.secure_url
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path)
        }
      }

      const bodyData = {
        ...req.body,
        ...(req.body.price !== undefined && { price: Number(req.body.price) }),
        ...(req.body.stock !== undefined && { stock: Number(req.body.stock) }),
        ...(req.body.categoryName !== undefined && {
          categoryName: req.body.categoryName,
        }),
        ...(req.body.status !== undefined && { status: req.body.status }),
        ...(req.body.code !== undefined && { code: req.body.code }),
        ...(uploadedImageUrl && { imageUrl: uploadedImageUrl }),
      }

      const input = updateProductSchema.parse(bodyData)
      const product = await productService.update(id, input)
      return sendSuccess(res, product)
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      next(error)
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      await productService.delete(id)
      return sendSuccess(res, null)
    } catch (error) {
      next(error)
    }
  },
}
