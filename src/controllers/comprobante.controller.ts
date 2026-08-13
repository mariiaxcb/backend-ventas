import type { Request, Response, NextFunction } from "express";
import { prisma } from "@/config/database";
import { AppError } from "@/middlewares/error.middleware";
import { encolarProcesamientoOcr } from "@/queues/ocr.queue";
import { bnbService } from "@/services/bnb.service";

export const comprobanteController = {
  /**
   * Recibe la imagen del comprobante (multipart/form-data, campo "comprobante"),
   * la asocia al pedido y encola el procesamiento OCR de forma asíncrona.
   */
  async subir(req: Request, res: Response, next: NextFunction) {
    try {
      const { pedidoId } = req.params;
      if (!req.file) throw new AppError("No se recibió ninguna imagen", 400);

      const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
      if (!pedido) throw new AppError("Pedido no encontrado", 404);

      // En producción, aquí se sube req.file a Supabase Storage y se
      // guarda la URL pública resultante en lugar de la ruta local.
      const imagenUrl = req.file.path;

      const comprobante = await prisma.comprobante.create({
        data: { pedidoId, imagenUrl },
      });

      await encolarProcesamientoOcr({
        pedidoId,
        comprobanteId: comprobante.id,
        rutaImagen: req.file.path,
      });

      res.status(202).json({ mensaje: "Comprobante recibido, procesando OCR", comprobante });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Segundo paso, posterior al OCR: cruza el monto/referencia detectados
   * contra el historial de transacciones del BNB antes de validar el pedido.
   */
  async verificarConBnb(req: Request, res: Response, next: NextFunction) {
    try {
      const { pedidoId } = req.params;

      const comprobante = await prisma.comprobante.findUnique({ where: { pedidoId } });
      if (!comprobante) throw new AppError("Comprobante no encontrado", 404);
      if (!comprobante.montoDetectado || !comprobante.referenciaBancaria) {
        throw new AppError("El OCR aún no detectó monto o referencia", 400);
      }

      const resultado = await bnbService.verificarTransaccion({
        monto: Number(comprobante.montoDetectado),
        referencia: comprobante.referenciaBancaria,
        fecha: comprobante.fechaDetectada ?? undefined,
      });

      const actualizado = await prisma.comprobante.update({
        where: { pedidoId },
        data: { verificadoBnb: resultado.encontrada && resultado.montoCoincide },
      });

      res.json({ resultado, comprobante: actualizado });
    } catch (error) {
      next(error);
    }
  },

  /** Genera un QR de cobro del BNB para un pedido (alternativa a subir comprobante). */
  async generarQrBnb(req: Request, res: Response, next: NextFunction) {
    try {
      const { pedidoId } = req.params;

      const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
      if (!pedido) throw new AppError("Pedido no encontrado", 404);

      const qr = await bnbService.generarQr({
        monto: Number(pedido.total),
        referencia: pedido.codigoPedido,
      });

      res.json(qr);
    } catch (error) {
      next(error);
    }
  },
};
