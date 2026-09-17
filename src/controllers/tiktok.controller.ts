import type { Request, Response } from 'express';
import { tikTokLiveService } from '@/services/tiktok.service';
import { streamService } from '@/services/stream.service';
import { sendSuccess } from '@/utils/response.util';

export const iniciarMonitoreoTikTok = async (req: Request, res: Response) => {
  const io = req.app.get('io');
  const adminId = Number((req as any).usuario?.id);

  let streamId: number | null = null;

  try {
    const { title, tiktokUsername } = req.body;

    if (!title || !tiktokUsername) {
      return res.status(400).json({
        error: 'Se requiere "title" y "tiktokUsername"',
      });
    }

    const cleanUsername = String(tiktokUsername).replace(/^@/, '').trim();

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

    return res.status(400).json({
      error: error?.message || 'No se pudo conectar al Live de TikTok',
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
