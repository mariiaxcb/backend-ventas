import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { pedidoService } from "@/services/pedido.service";
import { emitirPedidoNuevo, emitirPedidoActualizado } from "@/websockets/events/pedido.event";

const crearPedidoSchema = z.object({
  usuarioTiktok: z.string().min(1),
  productoId: z.string().uuid(),
  cantidad: z.number().int().positive().optional(),
});

const validarPedidoSchema = z.object({
  estado: z.enum(["VALIDADO", "RECHAZADO"]),
  observacion: z.string().optional(),
});

export const pedidoController = {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const estado = req.query.estado as "PENDIENTE" | "VALIDADO" | "RECHAZADO" | undefined;
      res.json(await pedidoService.listar(estado));
    } catch (error) {
      next(error);
    }
  },

  async obtener(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await pedidoService.obtener(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const input = crearPedidoSchema.parse(req.body);
      const pedido = await pedidoService.crear(input);
      emitirPedidoNuevo(pedido);
      res.status(201).json(pedido);
    } catch (error) {
      next(error);
    }
  },

  async validar(req: Request, res: Response, next: NextFunction) {
    try {
      const { estado, observacion } = validarPedidoSchema.parse(req.body);
      const pedido = await pedidoService.validar({
        pedidoId: req.params.id,
        estado,
        observacion,
      });
      emitirPedidoActualizado(pedido);
      res.json(pedido);
    } catch (error) {
      next(error);
    }
  },
};
