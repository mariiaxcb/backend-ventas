import type { NextFunction, Request, Response } from "express";
import { logger } from "@/utils/logger";

export class AppError extends Error {
  constructor(public mensaje: string, public statusCode = 400) {
    super(mensaje);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ mensaje: err.mensaje });
  }

  logger.error(err.message, { stack: err.stack });
  return res.status(500).json({ mensaje: "Error interno del servidor" });
}

export function notFoundHandler(_req: Request, res: Response) {
  return res.status(404).json({ mensaje: "Recurso no encontrado" });
}
