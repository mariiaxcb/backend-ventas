import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { productoService } from "@/services/producto.service";

const productoSchema = z.object({
  nombre: z.string().min(2),
  descripcion: z.string().optional(),
  precio: z.number().positive(),
  stock: z.number().int().min(0),
  imagenUrl: z.string().url().optional(),
  activo: z.boolean().optional(),
});

export const productoController = {
  async listar(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await productoService.listar());
    } catch (error) {
      next(error);
    }
  },

  async obtener(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await productoService.obtener(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const input = productoSchema.parse(req.body);
      res.status(201).json(await productoService.crear(input));
    } catch (error) {
      next(error);
    }
  },

  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const input = productoSchema.partial().parse(req.body);
      res.json(await productoService.actualizar(req.params.id, input));
    } catch (error) {
      next(error);
    }
  },

  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      await productoService.eliminar(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
