import { prisma } from "@/config/database";
import { AppError } from "@/middlewares/error.middleware";
import { productoService } from "./producto.service";
import type { EstadoPedido } from "@prisma/client";

function generarCodigoPedido(): string {
  return `PED-${Date.now().toString(36).toUpperCase()}`;
}

export interface CrearPedidoInput {
  usuarioTiktok: string;
  productoId: string;
  cantidad?: number;
}

export interface ValidarPedidoInput {
  pedidoId: string;
  estado: EstadoPedido;
  observacion?: string;
}

export const pedidoService = {
  listar: (estado?: EstadoPedido) =>
    prisma.pedido.findMany({
      where: estado ? { estado } : undefined,
      include: { producto: true, comprobante: true },
      orderBy: { createdAt: "desc" },
    }),

  obtener: async (id: string) => {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: { producto: true, comprobante: true },
    });
    if (!pedido) throw new AppError("Pedido no encontrado", 404);
    return pedido;
  },

  crear: async ({ usuarioTiktok, productoId, cantidad = 1 }: CrearPedidoInput) => {
    const producto = await productoService.obtener(productoId);
    const total = Number(producto.precio) * cantidad;

    return prisma.pedido.create({
      data: {
        usuarioTiktok,
        productoId,
        cantidad,
        total,
        codigoPedido: generarCodigoPedido(),
      },
      include: { producto: true },
    });
  },

  validar: async ({ pedidoId, estado, observacion }: ValidarPedidoInput) => {
    const pedido = await pedidoService.obtener(pedidoId);

    if (estado === "VALIDADO") {
      await productoService.descontarStock(pedido.productoId, pedido.cantidad);
    }

    return prisma.pedido.update({
      where: { id: pedidoId },
      data: { estado },
    });
  },
};
