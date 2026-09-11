import { TikTokLiveConnection } from 'tiktok-live-connector';
import { Server } from 'socket.io';
import { logger } from '@/utils/logger';
import { redis } from '@/config/redis';

export interface ComentarioFiltrado {
  usuario: string;
  nickname: string;
  fotoPerfil: string;
  comentario: string;
  fecha: string;
}

export class TikTokLiveConnectorService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tiktokLiveConnection: any = null;
  private palabrasClaveActuales: string[] = [];
  private currentUsername: string = '';
  private ioSocket: Server | null = null;

  public async conectarLive(
    uniqueId: string,
    palabrasClave: string[],
    ioSocket: Server
  ): Promise<{ roomId: string; status: string }> {
    await this.desconectar();

    this.currentUsername = uniqueId.replace(/^@/, '').trim();
    this.palabrasClaveActuales = palabrasClave;
    this.ioSocket = ioSocket;

    try {
      this.tiktokLiveConnection = new TikTokLiveConnection(this.currentUsername, {
  processInitialData: false,
  enableExtendedGiftInfo: false,
  // Desactiva la solicitud de firmas complejas si no tienes un servidor de firma configurado
  signProviderOptions: {
    enabled: false,
  },
  // Configuración de reconexión y headers web
  clientParams: {
    app_language: 'es-ES',
    device_platform: 'web',
  },
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
  },
} as any);

      // 1. REGISTRAR LISTENERS ANTES DE CONECTAR
      this.tiktokLiveConnection.on('chat', async (data: any) => {
        // Mapeo seguro del usuario
        const usuario: string =
          data.uniqueId ||
          data.userDetails?.uniqueId ||
          data.user?.uniqueId ||
          data.unique_id ||
          'Usuario_Anonimo';

        const nickname: string =
          data.nickname ||
          data.userDetails?.nickname ||
          data.user?.nickname ||
          usuario;

        const fotoPerfil: string =
          data.profilePictureUrl ||
          data.userDetails?.profilePictureUrl ||
          data.user?.profilePictureUrl ||
          data.user?.avatarThumb?.urlList?.[0] ||
          '';

        const comentario: string =
          data.comment ||
          data.commentText ||
          data.content ||
          '';

        if (!comentario || comentario.trim() === '') {
          return;
        }

        logger.info(`💬 [TikTok Live] @${usuario}: "${comentario}"`);

        const comentarioLower = comentario.toLowerCase().trim();

        // Si no hay palabras clave definidas, pasan todos los comentarios
        const coincideFiltro =
          this.palabrasClaveActuales.length === 0 ||
          this.palabrasClaveActuales.some((palabra) =>
            comentarioLower.includes(palabra.toLowerCase().trim())
          );

        if (coincideFiltro) {
          const ventaDetectada: ComentarioFiltrado = {
            usuario,
            nickname,
            fotoPerfil,
            comentario,
            fecha: new Date().toISOString(),
          };

          logger.info(`🎯 [FILTRO COINCIDE] @${usuario}: "${comentario}"`);

          // Guardar en Redis
          await redis.lpush(
            `live:ventas:${this.currentUsername}`,
            JSON.stringify(ventaDetectada)
          );

          // 🔴 SOLUCIÓN DUPLICADOS: Emitir ÚNICAMENTE a la sala correspondiente
          if (this.ioSocket) {
            console.log(
              `🚀 [EMITIENDO A FRONTEND EN SALA live:${this.currentUsername}]`,
              ventaDetectada
            );

            this.ioSocket
              .to(`live:${this.currentUsername}`)
              .emit('nueva_intencion_compra', ventaDetectada);
          } else {
            console.error('❌ ERROR: this.ioSocket es null, no se puede enviar al Frontend.');
          }
        }
      });

      this.tiktokLiveConnection.on('streamEnd', () => {
        logger.warn(`⚠️ El Live de @${this.currentUsername} ha finalizado.`);
      });

      this.tiktokLiveConnection.on('error', (err: any) => {
        logger.error(`❌ Error en TikTok Connection (@${this.currentUsername}):`, err);
      });

      // 2. CONECTAR
      const state = await this.tiktokLiveConnection.connect();
      logger.info(
        `✅ Conectado exitosamente al Live de @${this.currentUsername} (Room ID: ${state.roomId})`
      );

      return { roomId: state.roomId, status: 'connected' };
    } catch (err: any) {
      logger.error(`❌ Error al conectar al Live de @${this.currentUsername}:`, err);
      await this.desconectar();
      throw new Error(`No se pudo conectar al Live: ${err.message}`);
    }
  }

  public async desconectar(): Promise<void> {
    if (this.tiktokLiveConnection) {
      try {
        this.tiktokLiveConnection.disconnect();
      } catch (err) {
        logger.error('Error al desconectar TikTok Live', err);
      } finally {
        this.tiktokLiveConnection = null;
        logger.info('🔌 Conexión de TikTok Live cerrada.');
      }
    }
  }
}

export const tikTokLiveService = new TikTokLiveConnectorService();