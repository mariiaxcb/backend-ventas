import { AppError } from '@/middlewares/error.middleware'

/**
 * Validación del comprobante de pago leído por OCR.
 *
 * El comprobante solo sirve para VERIFICAR datos. No confirma el pago: eso
 * siempre lo hace el vendedor revisando su cuenta bancaria.
 *
 * Se validan tres cosas, y las tres son obligatorias:
 *  1. Monto suficiente para cubrir el total del pedido.
 *  2. Referencia del comprobante idéntica a la del QR de este pedido.
 *  3. Fecha y hora de la transacción dentro de la ventana válida de la orden.
 */

export interface ReceiptData {
  rawText: string
  amount: number | null
  /** Referencia tal como aparece en el comprobante. */
  reference: string | null
  /** Número de orden extraído de la referencia. */
  referenceOrderId: string | null
  productCode: string | null
  tiktokUsername: string | null
  /** Fecha y hora en que el banco registro la transaccion. */
  paidAt: Date | null
}

function normalizar(texto: string): string {
  return texto.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Extrae el monto: prioriza la etiqueta "suma de Bs." del comprobando bancario. */
function extractAmount(rawText: string): number | null {
  const patrones = [
    /suma\s+de\s+bs\.?\s*:?\s*([0-9]+[.,][0-9]{2})/i,
    /(?:monto|importe|total)\s*:?\s*([0-9]+[.,][0-9]{2})/i,
    /\bbs\.?\s*([0-9]+[.,][0-9]{2})/i,
  ]

  for (const patron of patrones) {
    const match = rawText.match(patron)
    if (match) return parseFloat(match[1].replace(',', '.'))
  }

  return null
}

/**
 * Etiquetas que normalmente siguen a la referencia en un comprobante bancario.
 * Cuando aparece una de estas, la referencia terminó: lo que venga después
 * pertenece a otro campo y no debe leerse como parte de la referencia.
 */
const ETIQUETAS_POSTERIORES =
  /^\s*(fecha|hora|monto|importe|total|suma|bs\.?|cuenta|banco|operaci[oó]n|nro|n[uú]mero|documento|ci|nit|descripci[oó]n|estado|tipo|comisi[oó]n|saldo|motivo|beneficiario|detalle|referencia)\b/i

/** Máximo de líneas que se toman como continuación de la referencia. */
const MAX_LINEAS_CONTINUACION = 3

/**
 * Extrae la referencia del comprobante, aunque el banco la parta en varias
 * líneas.
 *
 * El campo "Referencia" es corto pero el OCR suele cortarlo por el ancho de la
 * imagen, dejando el usuario a medias ("@rashad_bar" + "ra" en la línea
 * siguiente). Por eso se sigue leyendo hasta encontrar otra etiqueta conocida
 * del comprobante, en lugar de cortar en el primer salto de línea.
 *
 * Los fragmentos se unen sin separador porque el corte del OCR suele caer en
 * medio de una palabra; los separadores " - " del formato original ya vienen
 * dentro de cada línea.
 */
function extractReferenceLine(rawText: string): string | null {
  const lineas = rawText.split(/\r?\n/)

  const indiceInicio = lineas.findIndex((linea) =>
    /^\s*referencia\b/i.test(linea),
  )

  if (indiceInicio === -1) return null

  const primeraParte = lineas[indiceInicio].replace(
    /^\s*referencia\s*:?\s*/i,
    '',
  )
  const partes: string[] = [primeraParte]

  for (let i = indiceInicio + 1; i < lineas.length; i++) {
    if (partes.length > MAX_LINEAS_CONTINUACION) break

    const linea = lineas[i]

    // Línea vacía: el OCR corta los bloques con saltos en blanco.
    if (!linea.trim()) break

    // Empezó otro campo del comprobante, la referencia ya terminó.
    if (ETIQUETAS_POSTERIORES.test(linea)) break

    partes.push(linea.trim())
  }

  return partes.join('').trim() || null
}

function parseReferenceParts(
  reference: string | null,
): Pick<
  ReceiptData,
  'referenceOrderId' | 'productCode' | 'tiktokUsername'
> {
  if (!reference) {
    return { referenceOrderId: null, productCode: null, tiktokUsername: null }
  }

  const texto = reference.replace(/\s+/g, ' ').trim()

  // "#40 - mio123 - @usuario"
  const orderId = texto.match(/#?\s*(\d{1,6})/)?.[1] ?? null
  const username = texto.match(/@([A-Za-z0-9_.-]+)/)?.[1] ?? null

  // El código de producto es el tramo alfanumérico que no es el usuario.
  const sinUsuario = username
    ? texto.replace(new RegExp(`@?${username}`, 'i'), ' ')
    : texto
  const code = sinUsuario
    .replace(/#?\s*\d{1,6}/, ' ')
    .split(/[\s\-–—|,;]+/)
    .map((p) => p.trim())
    .find((p) => /[A-Za-z]/.test(p) && /[A-Za-z0-9]/.test(p)) ?? null

  return { referenceOrderId: orderId, productCode: code, tiktokUsername: username }
}

/** Fecha y hora de la transacción, con año de 2 o 4 dígitos. */
function extractPaidAt(rawText: string): Date | null {
  const fecha = rawText.match(
    /fecha(?:\s+de\s+la)?\s*transacci[oó]n\s*:?\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/i,
  )
  const hora = rawText.match(
    /hora(?:\s+de\s+la)?\s*transacci[oó]n\s*:?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/i,
  )

  if (!fecha) return null

  const [, dia, mes, anioCrudo] = fecha
  const anio =
    anioCrudo.length === 2 ? 2000 + Number(anioCrudo) : Number(anioCrudo)

  const fechaPago = new Date(
    anio,
    Number(mes) - 1,
    Number(dia),
    hora ? Number(hora[1]) : 0,
    hora ? Number(hora[2]) : 0,
    hora?.[3] ? Number(hora[3]) : 0,
  )

  return Number.isNaN(fechaPago.getTime()) ? null : fechaPago
}

export function extractReceiptData(rawText: string): ReceiptData {
  const reference = extractReferenceLine(rawText)

  return {
    rawText,
    amount: extractAmount(rawText),
    reference,
    ...parseReferenceParts(reference),
    paidAt: extractPaidAt(rawText),
  }
}

export interface OrderForValidation {
  id: number
  totalPrice: unknown
  createdAt: Date
  productCode: string
  tiktokUsername: string
}

/** Margen de tolerancia por desfase de zona horaria del comprobante. */
const TZ_TOLERANCE_MS = 5 * 60 * 1000

/**
 * Valida el comprobante contra el pedido. Lanza AppError con el motivo exacto
 * para que el bot pueda comunicárselo al comprador.
 */
export function validateReceipt(
  receipt: ReceiptData,
  order: OrderForValidation,
  now: Date = new Date(),
): void {
  // 1. Monto
  const total = Number(order.totalPrice)
  if (receipt.amount == null) {
    throw new AppError(
      'No se pudo leer el monto del comprobante. Envíalo de nuevo con la imagen completa.',
      400,
    )
  }
  if (receipt.amount < total) {
    throw new AppError(
      `El monto del comprobante (Bs. ${receipt.amount}) es menor al total del pedido (Bs. ${total}).`,
      400,
    )
  }

  // 2. Referencia: debe ser exactamente la de este pedido.
  if (!receipt.reference) {
    throw new AppError(
      'No se encontró la referencia del comprobante. Envíalo de nuevo con la imagen completa.',
      400,
    )
  }

  if (receipt.referenceOrderId !== String(order.id)) {
    throw new AppError(
      `Este comprobante corresponde al pedido #${receipt.referenceOrderId ?? '???'} y no al #${order.id}. Revisa que sea el QR de esta compra.`,
      400,
    )
  }

  if (
    receipt.productCode &&
    normalizar(receipt.productCode) !== normalizar(order.productCode)
  ) {
    throw new AppError(
      `El comprobante menciona el producto "${receipt.productCode}" y no "${order.productCode}".`,
      400,
    )
  }

  if (
    receipt.tiktokUsername &&
    order.tiktokUsername &&
    normalizar(receipt.tiktokUsername) !== normalizar(order.tiktokUsername)
  ) {
    throw new AppError(
      `El comprobante es de @${receipt.tiktokUsername} y este pedido es de @${order.tiktokUsername}.`,
      400,
    )
  }

  // 3. Ventana de tiempo de la transacción.
  if (receipt.paidAt) {
    if (receipt.paidAt.getTime() < order.createdAt.getTime() - TZ_TOLERANCE_MS) {
      throw new AppError(
        'Este comprobante es anterior a la creación del pedido. Revisa que sea el pago de esta compra.',
        400,
      )
    }

    if (receipt.paidAt.getTime() > now.getTime() + TZ_TOLERANCE_MS) {
      throw new AppError(
        'La fecha del comprobante es futura. Revisa la fecha y hora de la transferencia.',
        400,
      )
    }
  }
}