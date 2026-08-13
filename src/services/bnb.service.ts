import axios from "axios";
import { bnbConfig, bnbConfigurado } from "@/config/bnb";
import { logger } from "@/utils/logger";

/**
 * Integración con la API del Banco Nacional de Bolivia (BNB).
 *
 * El BNB ofrece principalmente dos mecanismos útiles para este sistema:
 *  1. QR simple (Bnb Pago Fácil / API QR) para generar códigos QR de cobro
 *     y consultar su estado (pagado / pendiente).
 *  2. Consulta/conciliación de transacciones de una cuenta empresarial,
 *     para cruzar el monto y la referencia detectados por OCR contra un
 *     movimiento real registrado por el banco.
 *
 * Este servicio es el único punto donde se llama a la API externa del BNB.
 * Se invoca desde pedido.service.ts (o comprobante.controller.ts) como un
 * paso extra de verificación DESPUÉS del OCR: el OCR da una lectura del
 * comprobante, y bnbService confirma contra el banco que esa transacción
 * realmente existe, antes de marcar el pedido como VALIDADO.
 */

interface GenerarQrInput {
  monto: number;
  referencia: string; // ej. el código de pedido
  descripcion?: string;
}

interface GenerarQrResponse {
  qrId: string;
  qrImagenBase64: string;
  expiracion: string;
}

interface EstadoQrResponse {
  qrId: string;
  pagado: boolean;
  fechaPago?: string;
  montoPagado?: number;
}

interface VerificarTransaccionInput {
  monto: number;
  referencia: string;
  fecha?: Date;
}

interface VerificarTransaccionResponse {
  encontrada: boolean;
  montoCoincide: boolean;
  transaccionId?: string;
}

function clienteBnb() {
  if (!bnbConfigurado()) {
    throw new Error(
      "BNB no configurado: define BNB_API_KEY y BNB_ACCOUNT_ID en las variables de entorno"
    );
  }

  return axios.create({
    baseURL: bnbConfig.baseUrl,
    headers: {
      Authorization: `Bearer ${bnbConfig.apiKey}`,
      "Content-Type": "application/json",
    },
  });
}

export const bnbService = {
  /**
   * Genera un QR de cobro asociado a un pedido. El cliente lo escanea
   * desde su app de banca y paga directamente al comerciante.
   */
  async generarQr(input: GenerarQrInput): Promise<GenerarQrResponse> {
    const cliente = clienteBnb();

    const { data } = await cliente.post("/v1/qrsimple/generar", {
      merchantId: bnbConfig.merchantId,
      cuenta: bnbConfig.accountId,
      monto: input.monto,
      moneda: "BOB",
      referencia: input.referencia,
      descripcion: input.descripcion ?? `Pedido ${input.referencia}`,
    });

    return {
      qrId: data.qrId,
      qrImagenBase64: data.qrImagenBase64,
      expiracion: data.expiracion,
    };
  },

  /** Consulta si un QR generado ya fue pagado. */
  async consultarEstadoQr(qrId: string): Promise<EstadoQrResponse> {
    const cliente = clienteBnb();
    const { data } = await cliente.get(`/v1/qrsimple/estado/${qrId}`);

    return {
      qrId,
      pagado: data.estado === "PAGADO",
      fechaPago: data.fechaPago,
      montoPagado: data.montoPagado,
    };
  },

  /**
   * Cruza los datos extraídos por OCR de un comprobante subido manualmente
   * (transferencia entre cuentas, no QR) contra el historial de
   * transacciones de la cuenta empresarial en el BNB.
   */
  async verificarTransaccion(
    input: VerificarTransaccionInput
  ): Promise<VerificarTransaccionResponse> {
    try {
      const cliente = clienteBnb();
      const { data } = await cliente.get("/v1/cuentas/movimientos", {
        params: {
          cuenta: bnbConfig.accountId,
          referencia: input.referencia,
          fecha: input.fecha?.toISOString().slice(0, 10),
        },
      });

      const movimiento = data.movimientos?.[0];
      if (!movimiento) {
        return { encontrada: false, montoCoincide: false };
      }

      return {
        encontrada: true,
        montoCoincide: Number(movimiento.monto) === input.monto,
        transaccionId: movimiento.id,
      };
    } catch (error) {
      logger.error("Error verificando transacción BNB", { error });
      return { encontrada: false, montoCoincide: false };
    }
  },
};
