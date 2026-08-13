import { logger } from "@/utils/logger";
import type { TiktokComentarioEvento, TiktokLiveConfig } from "@/types/tiktok.types";

type ComentarioHandler = (evento: TiktokComentarioEvento) => void;

/**
 * Captura de eventos del chat de TikTok Live. La conexión real usa una
 * librería no oficial (ej. tiktok-live-connector) que abre un websocket
 * hacia el room del streamer. Aquí se centraliza el ciclo de vida de esa
 * conexión para que websockets/events/liveChat.event.ts la consuma.
 */
class TiktokLiveService {
  private conectado = false;
  private handlers: ComentarioHandler[] = [];

  async conectar(config: TiktokLiveConfig) {
    // TODO: integrar librería de conexión no oficial a TikTok Live
    // (ej. tiktok-live-connector) usando config.uniqueId / config.roomId.
    logger.info(`Conectando a TikTok Live: ${config.uniqueId}`);
    this.conectado = true;
  }

  onComentario(handler: ComentarioHandler) {
    this.handlers.push(handler);
  }

  emitirComentario(evento: TiktokComentarioEvento) {
    this.handlers.forEach((h) => h(evento));
  }

  desconectar() {
    this.conectado = false;
  }

  estaConectado() {
    return this.conectado;
  }
}

export const tiktokService = new TiktokLiveService();
