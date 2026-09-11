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
  const usuarioKey = usuario.toLowerCase().trim();
  const setKey = `live:postulantes_set:${this.currentUsername}`;
  const listKey = `live:ventas:${this.currentUsername}`;

  try {
    // 1. Intentar agregar el usuario al Set para garantizar que sea único
    // SADD devuelve 1 si el usuario es NUEVO, 0 si YA EXISTÍA en el Set
    const esNuevoUsuario = await redis.sadd(setKey, usuarioKey);

    if (esNuevoUsuario === 1) {
      // 2. Verificar cuántos usuarios únicos llevamos registrados
      const totalPostulantes = await redis.scard(setKey);

      // 3. Si está dentro de los primeros 3 usuarios, guardarlo
      if (totalPostulantes <= 3) {
        const ventaDetectada: ComentarioFiltrado = {
          usuario,
          nickname,
          fotoPerfil,
          comentario,
          fecha: new Date().toISOString(),
        };

        // Guardar al final de la lista para mantener orden cronológico (de llegada)
        await redis.rpush(listKey, JSON.stringify(ventaDetectada));

        // Asignar TTL de 24 horas a ambas claves para limpiar memoria automáticamente
        await redis.expire(setKey, 86400);
        await redis.expire(listKey, 86400);

        logger.info(`🏆 [POSTULANTE ${totalPostulantes}/3] @${usuario}: "${comentario}"`);

        // Emitir evento al Frontend únicamente si calificó como postulante
        if (this.ioSocket) {
          this.ioSocket
            .to(`live:${this.currentUsername}`)
            .emit('nueva_intencion_compra', ventaDetectada);
        }
      } else {
        // Opcional: Eliminar del Set si superó la cuota de 3 para mantener coherencia
        await redis.srem(setKey, usuarioKey);
        logger.info(`⏳ [CUOTA LLENA] El usuario @${usuario} llegó después de los primeros 3.`);
      }
    } else {
      logger.info(`⚠️ [USUARIO DUPLICADO] @${usuario} ya se había postulado previamente.`);
    }
  } catch (redisError) {
    logger.error('❌ Error gestionando postulantes en Redis:', redisError);
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