import { whatsappService } from '@/services/whatsapp.service'
import { logger } from '@/utils/logger'

interface WhatsappInputData {
  to: string
  mensaje?: string
  imagenUrl?: string
  caption?: string
}

export async function enviarMensajeWhatsappSync(data: WhatsappInputData) {
  const { to, mensaje, imagenUrl, caption } = data

  try {
    if (imagenUrl) {
      return await whatsappService.enviarImagen({ to, imagenUrl, caption })
    }
    return await whatsappService.enviarMensaje({ to, mensaje: mensaje ?? '' })
  } catch (err: any) {
    logger.error(`Envío de WhatsApp fallido para el destinatario ${to}`, {
      error: err.message,
    })
    throw err
  }
}
