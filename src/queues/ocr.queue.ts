import { ocrService } from '@/services/ocr.service'
import { prisma } from '@/config/database'
import { emitirPedidoActualizado } from '@/websockets/events/pedido.event'
import { logger } from '@/utils/logger'

export interface OcrInputData {
  pedidoId: string
  comprobanteId: string
  rutaImagen: string
}

export async function procesarComprobanteSync(data: OcrInputData) {
  const { pedidoId, comprobanteId, rutaImagen } = data

  const receiptId = Number(comprobanteId)
  const orderId = Number(pedidoId)

  try {
    const resultado = await ocrService.procesarComprobante(rutaImagen)

    await prisma.receipt.update({
      where: { id: receiptId },
      data: {
        extractedAmount: resultado.montoDetectado ?? undefined,
      },
    })

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (order) emitirPedidoActualizado(order)

    return resultado
  } catch (err: any) {
    logger.error(
      `Procesamiento OCR fallido para el comprobante ${comprobanteId}`,
      { error: err.message },
    )
    throw err
  }
}
