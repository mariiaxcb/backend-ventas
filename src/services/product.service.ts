import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'
import { ProductStatus } from '@prisma/client'

export interface CreateProductInput {
  code: string
  name: string
  description?: string
  price: number
  stock: number
  imageUrl?: string
  categoryName: string
}

export interface UpdateProductInput {
  code?: string
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

    if (filters?.status) where.status = filters.status
    if (filters?.categoryId) where.categoryId = filters.categoryId
    if (filters?.inStock !== undefined) {
      where.stock = filters.inStock ? { gt: 0 } : { equals: 0 }
    }

    return prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { id: 'desc' },
    })
  },

  getCategories: () => {
    return prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
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

    const existingCode = await prisma.product.findUnique({
      where: { code: productData.code },
    })
    if (existingCode) throw new AppError('Product code already exists', 400)

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

    const { categoryName, code, ...productData } = data

    if (code) {
      const existingCode = await prisma.product.findUnique({ where: { code } })
      if (existingCode && existingCode.id !== id) {
        throw new AppError(
          'Product code already exists in another product',
          400,
        )
      }
    }

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
        ...(code && { code }),
        ...(categoryId && { categoryId }),
      },
      include: { category: true },
    })
  },

  /**
   * Desactiva un producto (baja lógica).
   *
   * No se borra la fila: las órdenes, reservas, historial de inventario y
   * streams la referencian, así que un DELETE físico falla por clave foránea
   * (P2003) y, si llegara a ejecutarse, rompería el historial de ventas.
   * El endpoint DELETE se conserva por compatibilidad, pero su efecto es
   * marcar el producto como INACTIVE para ocultarlo del catálogo.
   */
  delete: async (id: number) => {
    await productService.getById(id)
    return prisma.product.update({
      where: { id },
      data: { status: ProductStatus.INACTIVE },
      include: { category: true },
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

  async checkCodeExists(code: string): Promise<boolean> {
    const product = await prisma.product.findUnique({
      where: { code: code.trim() },
      select: { id: true },
    })
    return product !== null
  },
}
