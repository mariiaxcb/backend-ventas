import type { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '@/config/database'
import { env } from '@/config/env.config'
import { AppError } from '@/middlewares/error.middleware'
import { sendSuccess } from '@/utils/response.utils'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = loginSchema.parse(req.body)

      const admin = await prisma.admin.findUnique({ where: { username } })
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
            status: admin.status,
          },
        },
        'Login successful',
      )
    } catch (error) {
      next(error)
    }
  },
}
