import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/env.config";

export interface AuthRequest extends Request {
  usuario?: { id: string; rol: string };
}

export function verificarToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ mensaje: "Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { id: string; rol: string };
    req.usuario = payload;
    next();
  } catch {
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
}

export function requiereRol(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: "No tienes permisos para esta acción" });
    }
    next();
  };
}
