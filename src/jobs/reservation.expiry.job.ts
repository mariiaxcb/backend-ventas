import { reservationService } from '@/services/reservation.service'
import { getIO } from '@/websockets/socket.server'
import { env } from '@/config/env.config'
import { logger } from '@/utils/logger'

/**
 * Cancela periódicamente las reservas que el comprador no confirmó a tiempo
 * en WhatsApp.
 *
 * El control de vencimiento vive aquí y no en el frontend: así la reserva
 * queda en estado CANCELLED en la base de datos aunque el vendedor tenga la
 * aplicación cerrada, y las métricas del live mendekati siempre bien.
 */
let interval: NodeJS.Timeout | null = null

export async function sweepReservationsVencidas(): Promise<number> {
  try {
    const vencidas = await reservationService.expireStale()

    if (vencidas.length === 0) return 0

    for (const reserva of vencidas) {
      logger.info(
        `Reserva #${reserva.id} cancelada: @${reserva.tiktokUsername} no confirmó ${reserva.productName}`,
      )

      // El panel del vendedor muestra el cupo liberado en el momento.
      try {
        getIO().emit('reserva:cancelada', {
          reservaId: reserva.id,
          tiktokUsername: reserva.tiktokUsername,
          productCode: reserva.productCode,
          productName: reserva.productName,
          streamId: reserva.streamId,
        })
      } catch (error) {
        // El socket puede no estar inicializado todavía; no es crítico.
        logger.warn('No se pudo notificar la reserva cancelada por socket')
      }
    }

    return vencidas.length
  } catch (error: any) {
    logger.error('Error cancelando reservas vencidas', { error: error.message })
    return 0
  }
}

export function iniciarSweepReservas(): void {
  if (interval) return

  const cadaMs = env.RESERVATION_SWEEP_INTERVAL_SECONDS * 1000

  interval = setInterval(sweepReservationsVencidas, cadaMs)
  // No mantiene vivo el proceso al cerrar el servidor.
  interval.unref?.()

  logger.info(
    `Sweep de reservas activo: cadencia ${env.RESERVATION_SWEEP_INTERVAL_SECONDS}s, TTL ${env.RESERVATION_TTL_MINUTES} min`,
  )
}

export function detenerSweepReservas(): void {
  if (!interval) return
  clearInterval(interval)
  interval = null
}