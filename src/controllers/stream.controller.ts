// src/controllers/stream.controller.ts
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '@/config/database'
import { streamService } from '@/services/stream.service'
import { tikTokLiveService } from '@/services/tiktok.service'
import { AppError } from '@/middlewares/error.middleware'
import { sendSuccess } from '@/utils/response.util'

const createStreamSchema = z.object({
  title: z.string().min(1, 'Title is required'),
})

const manageProductSchema = z.object({
  productCode: z.string().min(1, 'Product code is required'),
})

export const streamController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const streams = await streamService.list()
      return sendSuccess(res, streams, 'Streams retrieved successfully')
    } catch (error) {
      next(error)
    }
  },

  async getActive(req: Request, res: Response, next: NextFunction) {
    try {
      const stream = await streamService.getActive()
      if (!stream) return sendSuccess(res, null, 'No active stream found')
      return sendSuccess(res, stream, 'Active stream retrieved successfully')
    } catch (error) {
      next(error)
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const stream = await streamService.getById(id)
      return sendSuccess(res, stream, 'Stream retrieved successfully')
    } catch (error) {
      next(error)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    let streamId: number | null = null
    const io = req.app.get('io')
    let adminTiktokUsername: string | null = null

    try {
      const { title } = createStreamSchema.parse(req.body)
      const adminId = Number((req as any).usuario.id)

      // El usuario de TikTok se define una sola vez en el Perfil del negocio.
      // Si no esta configurado, no se puede iniciar el live.
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
        select: { tiktokUsername: true },
      })

      adminTiktokUsername = admin?.tiktokUsername ?? null

      if (!adminTiktokUsername) {
        throw new AppError(
          'Debes configurar tu usuario de TikTok en la seccion Perfil antes de iniciar un live.',
          400,
        )
      }

      const tiktokUsername = adminTiktokUsername

      const stream = await streamService.create({
        title: title.trim(),
        tiktokUsername,
        adminId,
      })
      streamId = stream.id

      await tikTokLiveService.conectarLive(tiktokUsername, stream.id, io)

      return sendSuccess(res, stream, 'Live stream started successfully', 201)
    } catch (error: any) {
      console.error('Error al iniciar monitoreo de TikTok:', error)

      if (streamId !== null) {
        try {
          await streamService.endStream(streamId)
        } catch (endError) {
          console.error('No se pudo cerrar el stream tras el error:', endError)
        }
      }

      // Mensaje claro cuando el usuario de TikTok no esta en vivo.
      const mensaje = error?.message || 'No se pudo conectar al Live de TikTok'
      const noEstaEnVivo =
        /not live|offline|user.*not.*live|room.*not.*found|connect/i.test(mensaje)

      return res.status(400).json({
        error: noEstaEnVivo
          ? `El usuario @${adminTiktokUsername ?? ''} no esta en vivo en este momento. Verifica que estes transmitiendo en TikTok.`
          : mensaje,
      })
    }
  },

  async endStream(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const stream = await streamService.endStream(id)
      return sendSuccess(res, stream, 'Live stream ended successfully')
    } catch (error) {
      next(error)
    }
  },

  async addProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const { productCode } = manageProductSchema.parse(req.body)
      const stream = await streamService.addProduct(id, productCode)
      return sendSuccess(res, stream, 'Product added to stream successfully')
    } catch (error) {
      next(error)
    }
  },

  async removeProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const productCode = req.params.productCode
      const stream = await streamService.removeProduct(id, productCode)
      return sendSuccess(
        res,
        stream,
        'Product removed from stream successfully',
      )
    } catch (error) {
      next(error)
    }
  },
}
