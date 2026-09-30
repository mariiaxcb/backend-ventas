import { TikTokLiveConnection } from 'tiktok-live-connector'
import { Server } from 'socket.io'
import { prisma } from '@/config/database'
import { logger } from '@/utils/logger'

export interface ComentarioFiltrado {
  usuario: string
  nickname: string
  fotoPerfil: string
  comentario: string
  fecha: string
  uniqueId?: string
  comment?: string
  profilePictureUrl?: string
}

interface ProductoEnOferta {
  id: number
  code: string
  name: string
  stock: number
}

interface PostulantePayload {
  usuarioTiktok: string
  nickname: string
  productoId: string
  productoNombre: string
  comentario: string
  timestamp: string
  reservados: number
  limite: number
  stock: number
}

const PRODUCTOS_TTL_MS = 2000
const RESERVA_TIMEOUT_MS = 180000 // 3 minutos

function calcularLimite(stock: number): number {
  if (stock <= 0) return 0
  if (stock === 1) return 3
  return stock
}

export class TikTokLiveConnectorService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tiktokLiveConnection: any = null
  private currentUsername: string = ''
  private ioSocket: Server | null = null
  private streamId: number | null = null

  private productos: ProductoEnOferta[] = []
  private productosCargadosEn: number = 0
  // Map<productId, Map<usuarioTiktok, timestamp>>
  private reservadosPorProducto: Map<number, Map<string, number>> = new Map()

  public async conectarLive(
    uniqueId: string,
    streamId: number,
    ioSocket: Server,
  ): Promise<{ roomId: string; status: string; streamId: number }> {
    await this.desconectar()

    this.currentUsername = uniqueId.replace(/^@/, '').trim()
    this.ioSocket = ioSocket
    this.streamId = streamId

    await this.cargarProductos(true)
    await this.cargarReservasExistentes()

    try {
      this.tiktokLiveConnection = new TikTokLiveConnection(
        this.currentUsername,
        {
          processInitialData: false,
          enableExtendedGiftInfo: false,
        },
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.tiktokLiveConnection.on('chat', (data: any) => {
        void this.procesarComentario(data)
      })

      this.tiktokLiveConnection.on('streamEnd', () => {
        logger.warn(`⚠️ El Live de @${this.currentUsername} ha finalizado.`)
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.tiktokLiveConnection.on('error', (err: any) => {
        logger.error(
          `❌ Error en TikTok Connection (@${this.currentUsername}):`,
          err,
        )
      })

      const state = await this.tiktokLiveConnection.connect()
      logger.info(
        `✅ Conectado al Live de @${this.currentUsername} (Room ID: ${state.roomId}) — stream #${streamId}`,
      )

      return { roomId: state.roomId, status: 'connected', streamId }
    } catch (err: any) {
      console.error('Detalle completo del error:', err)
      await this.desconectar()
      throw new Error(`No se pudo conectar al Live: ${err.message}`)
    }
  }

  private async procesarComentario(data: any): Promise<void> {
    const nicknameCrudo: string =
      data.nickname || data.userDetails?.nickname || data.user?.nickname || ''

    const usuarioCrudo: string =
      data.uniqueId ||
      data.userDetails?.uniqueId ||
      data.user?.uniqueId ||
      data.unique_id ||
      'Usuario_Anonimo'

    const nombreMostrar: string =
      nicknameCrudo && nicknameCrudo !== 'Usuario_Anonimo'
        ? nicknameCrudo
        : usuarioCrudo !== 'Usuario_Anonimo'
          ? usuarioCrudo
          : 'Usuario'

    const usuario = nombreMostrar
    const nickname = nicknameCrudo || usuario

    const fotoPerfil: string =
      data.profilePictureUrl ||
      data.userDetails?.profilePictureUrl ||
      data.user?.profilePictureUrl ||
      data.user?.avatarThumb?.urlList?.[0] ||
      data.userDetails?.avatarThumb?.urlList?.[0] ||
      ''

    const comentario: string =
      data.comment || data.commentText || data.content || ''

    if (!comentario || comentario.trim() === '') return

    await this.cargarProductos(false)

    const comentarioLower = comentario.toLowerCase()
    const producto = [...this.productos]
      .sort((a, b) => b.code.length - a.code.length)
      .find((p) => comentarioLower.includes(p.code.toLowerCase()))

    if (!producto) return

    const ventaDetectada: ComentarioFiltrado = {
      usuario,
      nickname,
      fotoPerfil,
      comentario,
      fecha: new Date().toISOString(),
      uniqueId: usuario,
      comment: comentario,
      profilePictureUrl: fotoPerfil,
    }

    if (this.ioSocket) {
      const sala = `live:${this.currentUsername}`
      this.ioSocket.to(sala).emit('nueva_intencion_compra', ventaDetectada)
      this.ioSocket.except(sala).emit('nueva_intencion_compra', ventaDetectada)
    }

    const limite = calcularLimite(producto.stock)
    if (limite === 0) return

    const ahora = Date.now()
    const reservas = this.reservadosPorProducto.get(producto.id) ?? new Map<string, number>()

    // Limpiar reservas expiradas (más de 3 minutos)
    for (const [user, timestamp] of reservas.entries()) {
      if (ahora - timestamp > RESERVA_TIMEOUT_MS) {
        reservas.delete(user)
      }
    }

    // Verificar si el usuario ya tiene una reserva activa
    if (reservas.has(usuario)) {
      const timestamp = reservas.get(usuario)!
      if (ahora - timestamp <= RESERVA_TIMEOUT_MS) {
        return // La reserva aún es válida
      }
      // La reserva expiró, se elimina arriba y se permite una nueva
    }

    // Verificar si hay cupo disponible
    if (reservas.size >= limite) return

    // Crear nueva reserva
    reservas.set(usuario, ahora)
    this.reservadosPorProducto.set(producto.id, reservas)

    const payload: PostulantePayload = {
      usuarioTiktok: usuario,
      nickname,
      productoId: producto.code,
      productoNombre: producto.name,
      comentario,
      timestamp: ventaDetectada.fecha,
      reservados: reservas.size,
      limite,
      stock: producto.stock,
    }

    if (this.ioSocket) {
      const sala = `live:${this.currentUsername}`
      this.ioSocket.to(sala).emit('live:postulante', payload)
      this.ioSocket.except(sala).emit('live:postulante', payload)
    }

    logger.info(
      `🎯 [RESERVA ${reservas.size}/${limite}] @${usuario} -> ${producto.code} "${comentario}"`,
    )

    try {
      await prisma.reservation.create({
        data: {
          tiktokUsername: usuario,
          productCode: producto.code,
          timestamp: new Date(ventaDetectada.fecha),
          streamId: this.streamId!,
          productId: producto.id,
        },
      })
    } catch (err) {
      logger.error('Error guardando reserva en BD', err)
    }
  }

  private async cargarProductos(forzar: boolean): Promise<void> {
    if (!this.streamId) return
    const ahora = Date.now()
    if (!forzar && ahora - this.productosCargadosEn < PRODUCTOS_TTL_MS) return

    const stream = await prisma.stream.findUnique({
      where: { id: this.streamId },
      include: { products: true },
    })

    this.productos = (stream?.products ?? []).map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      stock: p.stock,
    }))
    this.productosCargadosEn = ahora
  }

  private async cargarReservasExistentes(): Promise<void> {
    if (!this.streamId) return
    this.reservadosPorProducto = new Map()

    const reservas = await prisma.reservation.findMany({
      where: { streamId: this.streamId },
      select: { productId: true, tiktokUsername: true, timestamp: true },
    })

    const ahora = Date.now()
    for (const reserva of reservas) {
      // Solo cargar reservas que no han expirado (menos de 3 minutos)
      const timestamp = new Date(reserva.timestamp).getTime()
      if (ahora - timestamp > RESERVA_TIMEOUT_MS) continue

      const map =
        this.reservadosPorProducto.get(reserva.productId) ?? new Map<string, number>()
      map.set(reserva.tiktokUsername, timestamp)
      this.reservadosPorProducto.set(reserva.productId, map)
    }
  }

  public async desconectar(): Promise<void> {
    if (this.tiktokLiveConnection) {
      try {
        this.tiktokLiveConnection.disconnect()
      } catch (err) {
        logger.error('Error al desconectar TikTok Live', err)
      } finally {
        this.tiktokLiveConnection = null
        logger.info('🔌 Conexión de TikTok Live cerrada.')
      }
    }
    this.streamId = null
    this.productos = []
    this.productosCargadosEn = 0
    this.reservadosPorProducto = new Map()
  }
}

export const tikTokLiveService = new TikTokLiveConnectorService()
