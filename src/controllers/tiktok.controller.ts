import type { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { AppError } from '@/middlewares/error.middleware';
import { tikTokLiveService } from '@/services/tiktok.service';
import { streamService } from '@/services/stream.service';
import { sendSuccess } from '@/utils/response.util';

export const iniciarMonitoreoTikTok = async (req: Request, res: Response) => {
  const io = req.app.get('io');
  const adminId = Number((req as any).usuario?.id);

  let streamId: number | null = null;

  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({
        error: 'Se requiere "title"',
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { tiktokUsername: true },
    })

    const cleanUsername = admin?.tiktokUsername?.replace(/^@/, '').trim()

    if (!cleanUsername) {
      return res.status(400).json({
        error:
          'Debes configurar tu usuario de TikTok en la seccion Perfil antes de iniciar un live.',
      });
    }

    const stream = await streamService.create({
      title: String(title).trim(),
      tiktokUsername: cleanUsername,
      adminId,
    });
    streamId = stream.id;

    await tikTokLiveService.conectarLive(cleanUsername, stream.id, io);

    return sendSuccess(
      res,
      stream,
      `Monitoreo iniciado para @${cleanUsername}`,
      201,
    );
  } catch (error: any) {
    console.error('Error al iniciar monitoreo de TikTok:', error);

    if (streamId !== null) {
      try {
        await streamService.endStream(streamId);
      } catch (endError) {
        console.error('No se pudo cerrar el stream tras el error:', endError);
      }
    }

    const mensaje = error?.message || 'No se pudo conectar al Live de TikTok'
    const noEstaEnVivo =
      /not live|offline|user.*not.*live|room.*not.*found|connect/i.test(mensaje)

    // admin puede no estar definido si falló antes; se relee para el mensaje.
    let tiktokUsername = ''
    try {
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
        select: { tiktokUsername: true },
      })
      tiktokUsername = admin?.tiktokUsername ?? ''
    } catch {
      // ignorar
    }

    return res.status(400).json({
      error: noEstaEnVivo
        ? `El usuario @${tiktokUsername} no esta en vivo en este momento. Verifica que estes transmitiendo en TikTok.`
        : mensaje,
    });
  }
};

export const detenerMonitoreoTikTok = async (_req: Request, res: Response) => {
  try {
    await tikTokLiveService.desconectar();

    const activeStream = await streamService.getActive();
    if (activeStream) {
      await streamService.endStream(activeStream.id);
    }

    return sendSuccess(res, null, 'Monitoreo detenido correctamente');
  } catch (error: any) {
    console.error('Error al detener monitoreo de TikTok:', error);
    return res.status(400).json({
      error: error?.message || 'No se pudo detener el monitoreo',
    });
  }
};
