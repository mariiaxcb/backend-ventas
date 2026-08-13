import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "@/config/database";
import { env } from "@/config/env.config";
import { AppError } from "@/middlewares/error.middleware";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const usuario = await prisma.usuario.findUnique({ where: { email } });
      if (!usuario) throw new AppError("Credenciales inválidas", 401);

      const passwordValido = await bcrypt.compare(password, usuario.password);
      if (!passwordValido) throw new AppError("Credenciales inválidas", 401);

      const token = jwt.sign(
        { id: usuario.id, rol: usuario.rol },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN }
      );

      res.json({
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async registrar(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = loginSchema.extend({ nombre: z.string().min(2) });
      const { nombre, email, password } = schema.parse(req.body);

      const existente = await prisma.usuario.findUnique({ where: { email } });
      if (existente) throw new AppError("El correo ya está registrado", 409);

      const passwordHash = await bcrypt.hash(password, 10);
      const usuario = await prisma.usuario.create({
        data: { nombre, email, password: passwordHash },
      });

      res.status(201).json({
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
      });
    } catch (error) {
      next(error);
    }
  },
};
