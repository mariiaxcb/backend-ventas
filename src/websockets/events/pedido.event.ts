import { getIO } from "../socket.server";
import type { Pedido } from "@prisma/client";

/** Notifica al panel que se creó un nuevo pedido. */
export function emitirPedidoNuevo(pedido: Pedido) {
  getIO().emit("pedido:nuevo", { pedido });
}

/** Notifica al panel que un pedido cambió de estado (validado/rechazado). */
export function emitirPedidoActualizado(pedido: Pedido) {
  getIO().emit("pedido:actualizado", { pedido });
}
