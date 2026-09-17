import { TikTokLiveConnection } from 'tiktok-live-connector';
import { Server } from 'socket.io';
import { prisma } from '@/config/database';
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

interface ProductoEnOferta {
  id: number;
  code: string;
  name: string;
  stock: number;
}

interface PostulantePayload {
  usuarioTiktok: string;
  nickname: string;
  productoId: string;
  productoNombre: string;
  comentario: string;
  timestamp: string;
  reservados: number;
  limite: number;
  stock: number;
}

const PRODUCTOS_TTL_MS = 2000;

// Regla de cupo por stock: 0 -> 0, 1 -> 3, >=2 -> stock
function calcularLimite(stock: number): number {
  if (stock <= 0) return 0;
  if (stock === 1) return 3;
  return stock;
}

export class TikTokLiveConnectorService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tiktokLiveConnection: any = null;
  private currentUsername: string = '';
  private ioSocket: Server | null = null;
  private streamId: number | null = null;

  private productos: ProductoEnOferta[] = [];
  private productosCargadosEn: number = 0;
  private reservadosPorProducto: Map<number, Set<string>> = new Map();

  public async conectarLive(
    uniqueId: string,
    streamId: number,
    ioSocket: Server,
  ): Promise<{ roomId: string; status: string; streamId: number }> {
    await this.desconectar();

    this.currentUsername = uniqueId.replace(/^@/, '').trim();
    this.ioSocket = ioSocket;
    this.streamId = streamId;

    await this.cargarProductos(true);
    await this.cargarReservasExistentes();

    try {
      this.tiktokLiveConnection = new TikTokLiveConnection(this.currentUsername, {
        processInitialData: false,
        enableExtendedGiftInfo: false,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.tiktokLiveConnection.on('chat', (data: any) => {
        void this.procesarComentario(data);
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
        `✅ Conectado al Live de @${this.currentUsername} (Room ID: ${state.roomId}) — stream #${streamId}`,
      );

      return { roomId: state.roomId, status: 'connected', streamId };
    } catch (err: any) {
      console.error('Detalle completo del error:', err);
      await this.desconectar();
      throw new Error(`No se pudo conectar al Live: ${err.message}`);
    }
  }

  private async procesarComentario(data: any): Promise<void> {
    const nicknameCrudo: string =
      data.nickname ||
      data.userDetails?.nickname ||
      data.user?.nickname ||
      '';

    const usuarioCrudo: string =
      data.uniqueId ||
      data.userDetails?.uniqueId ||
      data.user?.uniqueId ||
      data.unique_id ||
      'Usuario_Anonimo';

    // Igual que el chat filtrado: preferimos el nickname; si no, el usuario.
    const nombreMostrar: string =
      nicknameCrudo && nicknameCrudo !== 'Usuario_Anonimo'
        ? nicknameCrudo
        : usuarioCrudo !== 'Usuario_Anonimo'
          ? usuarioCrudo
          : 'Usuario';

    const usuario = nombreMostrar;
    const nickname = nicknameCrudo || usuario;

    const fotoPerfil: string =
      data.profilePictureUrl ||
      data.userDetails?.profilePictureUrl ||
      data.user?.profilePictureUrl ||
      data.user?.avatarThumb?.urlList?.[0] ||
      data.userDetails?.avatarThumb?.urlList?.[0] ||
      '';

    const comentario: string =
      data.comment || data.commentText || data.content || '';

    if (!comentario || comentario.trim() === '') return;

    await this.cargarProductos(false);

    const comentarioLower = comentario.toLowerCase();
    // Ordenar por longitud descendente evita falsos positivos cuando un código
    // es substring de otro (ej. "A1" y "A10").
    const producto = [...this.productos]
      .sort((a, b) => b.code.length - a.code.length)
      .find((p) => comentarioLower.includes(p.code.toLowerCase()));

    if (!producto) return;

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

    if (this.ioSocket) {
      const sala = `live:${this.currentUsername}`;
      this.ioSocket.to(sala).emit('nueva_intencion_compra', ventaDetectada);
      this.ioSocket.except(sala).emit('nueva_intencion_compra', ventaDetectada);
    }

    const limite = calcularLimite(producto.stock);
    if (limite === 0) return;

    const reservados = this.reservadosPorProducto.get(producto.id) ?? new Set<string>();
    if (reservados.has(usuario)) return;
    if (reservados.size >= limite) return;

    reservados.add(usuario);
    this.reservadosPorProducto.set(producto.id, reservados);

    const payload: PostulantePayload = {
      usuarioTiktok: usuario,
      nickname,
      productoId: producto.code,
      productoNombre: producto.name,
      comentario,
      timestamp: ventaDetectada.fecha,
      reservados: reservados.size,
      limite,
      stock: producto.stock,
    };

    if (this.ioSocket) {
      const sala = `live:${this.currentUsername}`;
      this.ioSocket.to(sala).emit('live:postulante', payload);
      this.ioSocket.except(sala).emit('live:postulante', payload);
    }

    logger.info(
      `🎯 [RESERVA ${reservados.size}/${limite}] @${usuario} -> ${producto.code} "${comentario}"`,
    );

    try {
      await prisma.reservation.create({
        data: {
          tiktokUsername: usuario,
          productCode: producto.code,
          comment: comentario,
          timestamp: new Date(ventaDetectada.fecha),
          streamId: this.streamId!,
          productId: producto.id,
        },
      });
    } catch (err) {
      logger.error('Error guardando reserva en BD', err);
    }
  }

  private async cargarProductos(forzar: boolean): Promise<void> {
    if (!this.streamId) return;
    const ahora = Date.now();
    if (!forzar && ahora - this.productosCargadosEn < PRODUCTOS_TTL_MS) return;

    const stream = await prisma.stream.findUnique({
      where: { id: this.streamId },
      include: { products: true },
    });

    this.productos = (stream?.products ?? []).map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      stock: p.stock,
    }));
    this.productosCargadosEn = ahora;
  }

  private async cargarReservasExistentes(): Promise<void> {
    if (!this.streamId) return;
    this.reservadosPorProducto = new Map();

    const reservas = await prisma.reservation.findMany({
      where: { streamId: this.streamId },
      select: { productId: true, tiktokUsername: true },
    });

    for (const reserva of reservas) {
      const set = this.reservadosPorProducto.get(reserva.productId) ?? new Set<string>();
      set.add(reserva.tiktokUsername);
      this.reservadosPorProducto.set(reserva.productId, set);
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
    this.streamId = null;
    this.productos = [];
    this.productosCargadosEn = 0;
    this.reservadosPorProducto = new Map();
  }
}

export const tikTokLiveService = new TikTokLiveConnectorService();
