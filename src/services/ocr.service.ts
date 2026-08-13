import sharp from "sharp";
import { createWorker } from "tesseract.js";
import {
  extraerFecha,
  extraerMonto,
  extraerReferencia,
} from "@/utils/regexValidator";
import { logger } from "@/utils/logger";
import type { ResultadoOcr } from "@/types/ocr.types";

/**
 * Preprocesa la imagen del comprobante con Sharp (escala de grises,
 * normalizado y aumento de nitidez) para mejorar la precisión del OCR.
 */
async function preprocesarImagen(rutaImagen: string): Promise<Buffer> {
  return sharp(rutaImagen)
    .resize({ width: 1200, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .sharpen()
    .toBuffer();
}

export const ocrService = {
  async procesarComprobante(rutaImagen: string): Promise<ResultadoOcr> {
    const imagenProcesada = await preprocesarImagen(rutaImagen);

    const worker = await createWorker("spa");
    try {
      const {
        data: { text, confidence },
      } = await worker.recognize(imagenProcesada);

      return {
        textoCrudo: text,
        montoDetectado: extraerMonto(text),
        fechaDetectada: extraerFecha(text),
        referenciaDetectada: extraerReferencia(text),
        confianza: confidence,
      };
    } catch (error) {
      logger.error("Error procesando OCR", { error });
      throw error;
    } finally {
      await worker.terminate();
    }
  },
};
