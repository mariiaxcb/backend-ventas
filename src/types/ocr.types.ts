export interface ResultadoOcr {
  textoCrudo: string;
  montoDetectado: number | null;
  fechaDetectada: Date | null;
  referenciaDetectada: string | null;
  confianza: number;
}

export interface ProcesarComprobanteInput {
  pedidoId: string;
  rutaImagen: string;
}
