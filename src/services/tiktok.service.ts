import { TikTokLiveConnection } from 'tiktok-live-connector';
import { Server } from 'socket.io';
import { logger } from '@/utils/logger';

export interface ComentarioFiltrado {
  usuario: string;
  nickname: string;
  fotoPerfil: string;
  comentario: string;
  fecha: string;
  // Campos secundarios en inglés para asegurar compatibilidad total con Frontend
  uniqueId?: string;
  comment?: string;
  profilePictureUrl?: string;
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
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.tiktokLiveConnection.on('chat', (data: any) => {
        // Extracción exhaustiva de ID de usuario (@uniqueId)
        const usuario: string =
          data.uniqueId ||
          data.userDetails?.uniqueId ||
          data.user?.uniqueId ||
          data.unique_id ||
          'Usuario_Anonimo';

        // Extracción exhaustiva de Nickname
        const nickname: string =
          data.nickname ||
          data.userDetails?.nickname ||
          data.user?.nickname ||
          usuario;

        // Extracción exhaustiva de Foto de Perfil
        const fotoPerfil: string =
          data.profilePictureUrl ||
          data.userDetails?.profilePictureUrl ||
          data.user?.profilePictureUrl ||
          data.user?.avatarThumb?.urlList?.[0] ||
          data.userDetails?.avatarThumb?.urlList?.[0] ||
          '';

        // Extracción exhaustiva de Comentario
        const comentario: string =
          data.comment ||
          data.commentText ||
          data.content ||
          '';

        if (!comentario || comentario.trim() === '') return;

        const comentarioLower = comentario.toLowerCase().trim();

        // Verificación de palabras clave
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
            uniqueId: usuario,
            comment: comentario,
            profilePictureUrl: fotoPerfil,
          };

          logger.info(`🎯 [FILTRO COINCIDE] ${nickname} (@${usuario}): "${comentario}"`);

          if (this.ioSocket) {
            const sala = `live:${this.currentUsername}`;
            
            // Emitir a la sala de Socket.io
            this.ioSocket.to(sala).emit('nueva_intencion_compra', ventaDetectada);
            
            // EMISIÓN DE RESPALDO: emitir a los clientes que NO estén en la sala
            // (así un cliente de la sala solo recibe el evento una vez)
            this.ioSocket.except(sala).emit('nueva_intencion_compra', ventaDetectada);
          }
        }
      });

      this.tiktokLiveConnection.on('streamEnd', () => {
        logger.warn(`⚠️ El Live de @${this.currentUsername} ha finalizado.`);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.tiktokLiveConnection.on('error', (err: any) => {
        logger.error(`❌ Error en TikTok Connection (@${this.currentUsername}):`, err);
      });

      const state = await this.tiktokLiveConnection.connect();
      logger.info(
        `✅ Conectado exitosamente al Live de @${this.currentUsername} (Room ID: ${state.roomId})`
      );

      return { roomId: state.roomId, status: 'connected' };
    } catch (err: any) {
      console.error('Detalle completo del error:', err);
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