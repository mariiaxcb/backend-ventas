import { prisma } from "@/config/database";
import { AppError } from "@/middlewares/error.middleware";

export interface ProductoInput {
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  imagenUrl?: string;
  activo?: boolean;
}

export const productoService = {
  listar: () => prisma.producto.findMany({ orderBy: { createdAt: "desc" } }),

  obtener: async (id: string) => {
    const producto = await prisma.producto.findUnique({ where: { id } });
    if (!producto) throw new AppError("Producto no encontrado", 404);
    return producto;
  },

  crear: (input: ProductoInput) => prisma.producto.create({ data: input }),

  actualizar: async (id: string, input: Partial<ProductoInput>) => {
    await productoService.obtener(id);
    return prisma.producto.update({ where: { id }, data: input });
  },

  eliminar: async (id: string) => {
    await productoService.obtener(id);
    return prisma.producto.delete({ where: { id } });
  },

  descontarStock: async (id: string, cantidad: number) => {
    const producto = await productoService.obtener(id);
    if (producto.stock < cantidad) {
      throw new AppError("Stock insuficiente", 400);
    }
    return prisma.producto.update({
      where: { id },
      data: { stock: producto.stock - cantidad },
    });
  },
};
