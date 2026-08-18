import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'
import { ProductStatus } from '@prisma/client'

export interface CreateProductInput {
  name: string
  description?: string
  price: number
  stock: number
  imageUrl?: string
  categoryName: string
}

export interface UpdateProductInput {
  name?: string
  description?: string
  price?: number
  stock?: number
  imageUrl?: string
  categoryName?: string
  status?: ProductStatus
}

export interface ProductFilters {
  status?: ProductStatus
  categoryId?: number
  inStock?: boolean
}

export const productService = {
  list: (filters?: ProductFilters) => {
    const where: any = {}

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId
    }

    if (filters?.inStock !== undefined) {
      where.stock = filters.inStock ? { gt: 0 } : { equals: 0 }
    }

    return prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { id: 'desc' },
    })
  },

  getById: async (id: number) => {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    })
    if (!product) throw new AppError('Product not found', 404)
    return product
  },

  create: async (data: CreateProductInput) => {
    const { categoryName, ...productData } = data

    const category = await prisma.category.upsert({
      where: { name: categoryName.trim() },
      update: {},
      create: { name: categoryName.trim() },
    })

    return prisma.product.create({
      data: {
        ...productData,
        categoryId: category.id,
      },
      include: { category: true },
    })
  },

  update: async (id: number, data: UpdateProductInput) => {
    await productService.getById(id)

    const { categoryName, ...productData } = data
    let categoryId: number | undefined

    if (categoryName) {
      const category = await prisma.category.upsert({
        where: { name: categoryName.trim() },
        update: {},
        create: { name: categoryName.trim() },
      })
      categoryId = category.id
    }

    return prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(categoryId && { categoryId }),
      },
      include: { category: true },
    })
  },

  delete: async (id: number) => {
    await productService.getById(id)
    return prisma.product.delete({
      where: { id },
    })
  },

  decreaseStock: async (id: number, quantity: number) => {
    const product = await productService.getById(id)
    if (product.stock < quantity) {
      throw new AppError(`Insufficient stock for product ${product.name}`, 400)
    }
    return prisma.product.update({
      where: { id },
      data: { stock: product.stock - quantity },
    })
  },
}
