import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'

export interface ProductInput {
  name: string
  description?: string
  price: number
  stock: number
  imageUrl?: string
  categoryId: number
}

export const productoService = {
  listar: () => prisma.product.findMany({ orderBy: { id: 'desc' } }),

  obtener: async (id: number) => {
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) throw new AppError('Product not found', 404)
    return product
  },

  crear: (input: ProductInput) =>
    prisma.product.create({
      data: {
        name: input.name,
        description: input.description,
        price: input.price,
        stock: input.stock,
        imageUrl: input.imageUrl,
        categoryId: input.categoryId,
      },
    }),

  actualizar: async (id: number, input: Partial<ProductInput>) => {
    await productoService.obtener(id)
    return prisma.product.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.stock !== undefined && { stock: input.stock }),
        ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      },
    })
  },

  eliminar: async (id: number) => {
    await productoService.obtener(id)
    return prisma.product.delete({ where: { id } })
  },

  descontarStock: async (id: number, cantidad: number) => {
    const product = await productoService.obtener(id)
    if (product.stock < cantidad) {
      throw new AppError('Insufficient stock', 400)
    }
    return prisma.product.update({
      where: { id },
      data: { stock: product.stock - cantidad },
    })
  },
}
