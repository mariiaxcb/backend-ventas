/**
 * Pruebas de la lectura del comprobante.
 *
 * El OCR cambia su salida segun la foto que manda el cliente: resolucion, angulo
 * y, sobre todo, si el banco parte una fila en dos. Estas pruebas fijan todos
 * los layouts en los que puede venir esa fila partida, porque es exactamente
 * ahi donde se perdia media palabra del nombre de usuario.
 *
 * Estos tests importan receipt-validation.service: el mismo archivo que valida
 * la compra de verdad.
 *
 * Ejecutar con: npm test
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  extractReceiptData,
  validateReceipt,
} from '@/services/receipt-validation.service'

/** Lo que el banco escribe antes de la fila de la referencia. */
const PREFIJO = `BNB
Comprobante Electrónico
Transferencia interbancaria
`

/** Lo que escribe después: las demás filas del comprobante. */
const SUFIJO = `Fecha de la
transacción:       8/10/2026
Hora de la
transacción:       16:59:06
La suma de Bs.:    99.99
Se acreditó a la cuenta: 3187030000001
Bancarización: 98845*1202BNB*3609
`

/** El usuario que el banco partió en dos filas. */
const ESPERADO = 'rashad_barra'

test('el usuario partido en dos filas se lee entero', () => {
  // El banco escribe "#44 - mio123 - @rash" y "@...ad_barra" cae en la fila
  // siguiente. Si solo se lee la primera, el comprobante se rechaza como si
  // fuera de otra persona.
  const layouts: [string, string][] = [
    ['valor y continuacion juntos', 'Referencia:        #44 - mio123 - @rash\nad_barra\n'],
    ['continuacion antes de otra etiqueta', 'Referencia:        #44 - mio123 - @rash\n                   ad_barra\nFecha de la\n'],
    ['linea de puntos en medio', 'Referencia:        #44 - mio123 - @rash\n....................\nad_barra\n'],
    ['etiqueta sola y valor aparte', 'Referencia:\n#44 - mio123 - @rash\nad_barra\n'],
    ['partido justo antes de un "_"', 'Referencia:        #44 - mio123 - @rash\nad_\nbarra\n'],
    ['relleno con guiones bajos', 'Referencia:        #44 - mio123 - @rash\n_____\nad_barra\n'],
    ['separador que el OCR no leyo', 'Referencia:        #44 - mio123 - @rash\n\nad_barra\n'],
    ['dos separadores vacios', 'Referencia:        #44 - mio123 - @rash\n\n\nad_barra\n'],
    ['vacio y puntos juntos', 'Referencia:        #44 - mio123 - @rash\n\n....................\nad_barra\n'],
    ['partido en tres lineas', 'Referencia:        #44 - mio123 - @rash\nad_\n\nbarra\n'],
    ['con espacios delante', 'Referencia:        #44 - mio123 - @rash\n\n ad_barra\n'],
    ['todo en una sola linea', 'Referencia:        #44 - mio123 - @rashad_barra\n'],
  ]

  for (const [nombre, bloque] of layouts) {
    const datos = extractReceiptData(PREFIJO + bloque + SUFIJO)

    assert.equal(
      datos.tiktokUsername,
      ESPERADO,
      `deberia leerse "@${ESPERADO}" en el layout: ${nombre}`,
    )
    assert.equal(datos.referenceOrderId, '44', `layout: ${nombre}`)
  }
})

test('la referencia completa no arrastra las filas siguientes', () => {
  const datos = extractReceiptData(
    PREFIJO + 'Referencia:        #44 - mio123 - @rash\nad_barra\n' + SUFIJO,
  )

  assert.equal(datos.reference, '#44 - mio123 - @rashad_barra')
  assert.equal(datos.referenceOrderId, '44')
  assert.equal(datos.productCode, 'mio123')
})

test('el monto y la fecha se leen igual', () => {
  const datos = extractReceiptData(
    PREFIJO + 'Referencia:        #44 - mio123 - @rash\nad_barra\n' + SUFIJO,
  )

  assert.equal(datos.amount, 99.99)

  const fecha = datos.paidAt
  assert.ok(fecha, 'deberia leer la fecha')
  assert.equal(fecha.getFullYear(), 2026)
  assert.equal(fecha.getMonth(), 9)
  assert.equal(fecha.getDate(), 8)
  assert.equal(fecha.getHours(), 16)
  assert.equal(fecha.getMinutes(), 59)
})

test('un comprobante de otro pedido no se mezcla con este', () => {
  const datos = extractReceiptData(
    PREFIJO + 'Referencia:        #41 - mio123 - @otro_usuario\n' + SUFIJO,
  )

  assert.equal(datos.referenceOrderId, '41')
  assert.equal(datos.tiktokUsername, 'otro_usuario')
  assert.equal(datos.productCode, 'mio123')
})

test('sin fila de referencia no se inventa ninguna', () => {
  const datos = extractReceiptData(PREFIJO + SUFIJO)

  assert.equal(datos.reference, null)
  assert.equal(datos.tiktokUsername, null)
})

test('un comprobante bien leido pasa la validacion', () => {
  const datos = extractReceiptData(
    PREFIJO + 'Referencia:        #44 - mio123 - @rash\nad_barra\n' + SUFIJO,
  )

  assert.doesNotThrow(() =>
    validateReceipt(datos, {
      id: 44,
      totalPrice: 99.99,
      createdAt: new Date('2026-10-08T20:00:00Z'),
      productCode: 'MIO123',
      tiktokUsername: ESPERADO,
    }),
  )
})

test('un comprobante de otra persona sigue siendo rechazado', () => {
  // La lectura flexible no puede terminar aceptando el comprobante de otro: si
  // el nombre no coincide, es otro pago y lo decide el vendedor, no el OCR.
  const datos = extractReceiptData(
    PREFIJO + 'Referencia:        #44 - mio123 - @otra_persona\n' + SUFIJO,
  )

  assert.throws(
    () =>
      validateReceipt(datos, {
        id: 44,
        totalPrice: 99.99,
        createdAt: new Date('2026-10-08T20:00:00Z'),
        productCode: 'MIO123',
        tiktokUsername: ESPERADO,
      }),
    /otra_persona/,
  )
})

test('un comprobante de otro pedido sigue siendo rechazado', () => {
  const datos = extractReceiptData(
    PREFIJO + 'Referencia:        #41 - mio123 - @rashad_barra\n' + SUFIJO,
  )

  assert.throws(
    () =>
      validateReceipt(datos, {
        id: 44,
        totalPrice: 99.99,
        createdAt: new Date('2026-10-08T20:00:00Z'),
        productCode: 'MIO123',
        tiktokUsername: ESPERADO,
      }),
    /#41/,
  )
})
