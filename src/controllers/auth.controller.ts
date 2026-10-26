import type { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '@/config/database'
import { env } from '@/config/env.config'
import { AppError } from '@/middlewares/error.middleware'
import { sendSuccess } from '@/utils/response.util'
import { enviarEmailRestablecimientoPassword } from '@/services/email.service'

const loginSchema = z.object({
  email: z.string().min(1, 'El correo es requerido'),
  password: z.string().min(1, 'La contrasena es requerida'),
})

const forgotPasswordSchema = z.object({
  email: z.string().min(3, 'El correo es requerido').max(120, 'El correo es demasiado largo'),
})

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'El token es requerido'),
  newPassword: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres'),
})

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = loginSchema.parse(req.body)

      const admin = await prisma.admin.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
      })
      if (!admin) throw new AppError('Invalid credentials', 401)

      if (admin.status !== 'ACTIVE') {
        throw new AppError('User account is inactive', 403)
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password)
      if (!isPasswordValid) throw new AppError('Invalid credentials', 401)

      const token = jwt.sign(
        { id: admin.id, username: admin.username },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
      )

      return sendSuccess(
        res,
        {
          token,
          user: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            status: admin.status,
          },
        },
        'Login successful',
      )
    } catch (error) {
      next(error)
    }
  },

  /**
   * Solicita el correo de recuperacion de contrasena.
   *
   * Responde siempre con lo mismo, sin importar si el correo existe o no, para
   * no dar pistas a quien no es el comprador.
   */
  async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body)

      const admin = await prisma.admin.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
      })

      if (admin) {
        const resetToken = jwt.sign(
          {
            purpose: 'reset_password',
            adminId: admin.id,
            username: admin.username,
          },
          env.JWT_SECRET,
          { expiresIn: '1h' },
        )

        await enviarEmailRestablecimientoPassword({
          email: admin.email,
          usuario: admin.username,
          token: resetToken,
          linkBase: env.FRONTEND_URL,
        })
      }

      // Respuesta generica: igual si el correo existe o no.
      return sendSuccess(
        res,
        null,
        'Si el correo existe, se envio el enlace de recuperacion de contrasena.',
      )
    } catch (error) {
      next(error)
    }
  },

  /**
   * Cambia la contrasena usando el token de recuperacion.
   *
   * El token es un JWT firmado con prop `purpose: 'reset_password'`, de 1 hora
   * de vida, y elige al admin por su id.
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body)

      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        purpose?: string
        adminId?: number
        username?: string
        exp?: number
      }

      if (decoded.purpose !== 'reset_password') {
        throw new AppError('El token de recuperacion no es valido.', 400)
      }

      if (!decoded.adminId) {
        throw new AppError('El token de recuperacion no es valido.', 400)
      }

      if (typeof decoded.exp !== 'number' || decoded.exp * 1000 < Date.now()) {
        throw new AppError('El enlace de recuperacion expiro.', 400)
      }

      const admin = await prisma.admin.findUnique({
        where: { id: decoded.adminId },
      })

      if (!admin) {
        throw new AppError('Usuario no encontrado.', 404)
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10)

      const updated = await prisma.admin.update({
        where: { id: admin.id },
        data: { password: hashedPassword },
      })

      return sendSuccess(
        res,
        { username: updated.username },
        'Contrasena actualizada correctamente.',
      )
    } catch (error) {
      next(error)
    }
  },
}
