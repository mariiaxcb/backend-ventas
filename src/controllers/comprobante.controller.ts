import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@/config/database'
import { AppError } from '@/middlewares/error.middleware'
import { encolarProcesamientoOcr } from '@/queues/ocr.queue'
import { bnbService } from '@/services/bnb.service'

export const comprobanteController = {
  /**
   * Recibe la imagen del comprobante subida a Cloudinary (multipart/form-data, campo "receipt"),
   * la asocia a la orden en la BD y encola el procesamiento OCR.
   */
  async subir(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = Number(req.params.pedidoId)
      if (isNaN(orderId)) throw new AppError('Invalid order ID', 400)
      if (!req.file) throw new AppError('No receipt image received', 400)

      const order = await prisma.order.findUnique({ where: { id: orderId } })
      if (!order) throw new AppError('Order not found', 404)

      const imageUrl = req.file.path // URL devuelta por Cloudinary

      const receipt = await prisma.receipt.create({
        data: {
          orderId,
          imageUrl,
          validationStatus: 'PENDING',
        },
      })

      await encolarProcesamientoOcr({
        pedidoId: String(orderId),
        comprobanteId: String(receipt.id),
        rutaImagen: imageUrl,
      })

      res.status(202).json({
        message: 'Receipt uploaded successfully to Cloudinary, processing OCR',
        receipt,
      })
    } catch (error) {
      next(error)
    }
  },

  /**
   * Verifica los datos detectados por el OCR contra el BNB.
   */
  async verificarConBnb(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = Number(req.params.pedidoId)
      if (isNaN(orderId)) throw new AppError('Invalid order ID', 400)

      const receipt = await prisma.receipt.findUnique({ where: { orderId } })
      if (!receipt) throw new AppError('Receipt not found', 404)
      if (!receipt.extractedAmount) {
        throw new AppError('OCR has not detected an amount yet', 400)
      }

      const outcome = await bnbService.verificarTransaccion({
        monto: Number(receipt.extractedAmount),
        referencia: String(orderId),
      })

      const updatedReceipt = await prisma.receipt.update({
        where: { orderId },
        data: {
          validationStatus:
            outcome.encontrada && outcome.montoCoincide
              ? 'VALIDATED'
              : 'REJECTED',
        },
      })

      res.json({ outcome, receipt: updatedReceipt })
    } catch (error) {
      next(error)
    }
  },

  /** Genera un QR de cobro del BNB para una orden. */
  async generarQrBnb(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = Number(req.params.pedidoId)
      if (isNaN(orderId)) throw new AppError('Invalid order ID', 400)

      const order = await prisma.order.findUnique({ where: { id: orderId } })
      if (!order) throw new AppError('Order not found', 404)

      const qr = await bnbService.generarQr({
        monto: Number(order.totalPrice),
        referencia: String(order.id),
      })

      res.json(qr)
    } catch (error) {
      next(error)
    }
  },
}
