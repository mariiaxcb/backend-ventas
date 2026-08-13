import { getIO } from "../socket.server";
import type { TiktokComentarioEvento, TiktokPostulanteEvento } from "@/types/tiktok.types";

/**
 * Retransmite comentarios y postulaciones del chat de TikTok Live
 * hacia todos los clientes del panel conectados vía Socket.io.
 */
export function emitirComentarioLive(evento: TiktokComentarioEvento) {
  getIO().emit("chat:mensaje", evento);
}

export function emitirPostulante(evento: TiktokPostulanteEvento) {
  getIO().emit("live:postulante", evento);
}
