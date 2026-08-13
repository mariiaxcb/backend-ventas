import { getIO } from '../socket.server'
import type { Order } from '@prisma/client'

/** Notifica al panel que se creó un nuevo pedido. */
export function emitirPedidoNuevo(order: Order) {
  getIO().emit('pedido:nuevo', { order })
}

/** Notifica al panel que un pedido cambió de estado. */
export function emitirPedidoActualizado(order: Order) {
  getIO().emit('pedido:actualizado', { order })
}
