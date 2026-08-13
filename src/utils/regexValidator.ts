/**
 * Expresiones regulares y helpers para extraer datos estructurados
 * del texto crudo devuelto por el OCR de un comprobante de pago.
 */

// Monto en Bs, ej: "Bs. 150.00", "150,00 BOB", "Total: 150"
const REGEX_MONTO = /(?:Bs\.?|BOB)?\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s?(?:Bs\.?|BOB)?/i;

// Fecha en formatos dd/mm/yyyy o dd-mm-yyyy
const REGEX_FECHA = /(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})/;

// Número de referencia / operación bancaria (alfanumérico, 6+ caracteres)
const REGEX_REFERENCIA = /(?:Nro\.?\s?Operaci[oó]n|Referencia|Ref\.?)[:\s]*([A-Z0-9\-]{6,})/i;

export function extraerMonto(texto: string): number | null {
  const match = texto.match(REGEX_MONTO);
  if (!match) return null;
  const limpio = match[1].replace(/\./g, "").replace(",", ".");
  const valor = parseFloat(limpio);
  return Number.isNaN(valor) ? null : valor;
}

export function extraerFecha(texto: string): Date | null {
  const match = texto.match(REGEX_FECHA);
  if (!match) return null;
  const [, dia, mes, anioRaw] = match;
  const anio = anioRaw.length === 2 ? `20${anioRaw}` : anioRaw;
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function extraerReferencia(texto: string): string | null {
  const match = texto.match(REGEX_REFERENCIA);
  return match ? match[1] : null;
}
