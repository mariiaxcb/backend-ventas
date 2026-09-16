import { Request, Response } from 'express';
import { tikTokLiveService } from '@/services/tiktok.service';

export const iniciarMonitoreoTikTok = async (req: Request, res: Response) => {
  try {
    const { tiktokUsername, palabrasClave } = req.body;

    if (!tiktokUsername || !Array.isArray(palabrasClave)) {
      return res.status(400).json({
        error: 'Se requiere "tiktokUsername" y un arreglo de "palabrasClave"',
      });
    }

    // Obtener la instancia global de Socket.io asignada en Express
    const io = req.app.get('io');

    await tikTokLiveService.conectarLive(tiktokUsername, palabrasClave, io);

    return res.json({
      mensaje: `Monitoreo iniciado para @${tiktokUsername}`,
      palabrasFiltradas: palabrasClave,
    });
  } catch (error: any) {
    console.error('Error al iniciar monitoreo de TikTok:', error);

    return res.status(400).json({ 
      error: error?.message || 'No se pudo conectar al Live de TikTok' 
    });
  }
};