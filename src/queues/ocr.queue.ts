import { Queue, Worker, type Job } from 'bullmq'
import { redisConnection } from '@/config/redis'
import { ocrService } from '@/services/ocr.service'
import { prisma } from '@/config/database'
import { emitirPedidoActualizado } from '@/websockets/events/pedido.event'
import { logger } from '@/utils/logger'

export interface OcrJobData {
  pedidoId: string
  comprobanteId: string
  rutaImagen: string
}

export const ocrQueue = new Queue<OcrJobData>('ocr', {
  connection: redisConnection,
})

export const ocrWorker = new Worker<OcrJobData>(
  'ocr',
  async (job: Job<OcrJobData>) => {
    const { pedidoId, comprobanteId, rutaImagen } = job.data

    const receiptId = Number(comprobanteId)
    const orderId = Number(pedidoId)

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
  },
  { connection: redisConnection },
)

ocrWorker.on('failed', (job, err) => {
  logger.error(`Job OCR fallido (${job?.id})`, { error: err.message })
})

export async function encolarProcesamientoOcr(data: OcrJobData) {
  return ocrQueue.add('procesar-comprobante', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  })
}
