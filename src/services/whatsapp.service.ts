import axios from "axios";
import { whatsappConfig, whatsappEndpoint, whatsappConfigurado } from "@/config/whatsapp";
import { logger } from "@/utils/logger";
import type { EnviarImagenInput, EnviarMensajeInput } from "@/types/whatsapp.types";

/**
 * Envío/recepción de mensajes vía Meta Cloud API (WhatsApp Business).
 * Para el prototipo local también existe una variante con whatsapp-web.js;
 * en producción se recomienda usar Meta Cloud API (este servicio).
 */
export const whatsappService = {
  async enviarMensaje({ to, mensaje }: EnviarMensajeInput) {
    if (!whatsappConfigurado()) {
      logger.warn("WhatsApp no configurado, omitiendo envío");
      return null;
    }

    const { data } = await axios.post(
      whatsappEndpoint(`${whatsappConfig.phoneNumberId}/messages`),
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: mensaje },
      },
      { headers: { Authorization: `Bearer ${whatsappConfig.token}` } }
    );

    return data;
  },

  async enviarImagen({ to, imagenUrl, caption }: EnviarImagenInput) {
    if (!whatsappConfigurado()) {
      logger.warn("WhatsApp no configurado, omitiendo envío");
      return null;
    }

    const { data } = await axios.post(
      whatsappEndpoint(`${whatsappConfig.phoneNumberId}/messages`),
      {
        messaging_product: "whatsapp",
        to,
        type: "image",
        image: { link: imagenUrl, caption },
      },
      { headers: { Authorization: `Bearer ${whatsappConfig.token}` } }
    );

    return data;
  },

  async descargarMedia(mediaId: string): Promise<Buffer> {
    const { data: metadata } = await axios.get(whatsappEndpoint(mediaId), {
      headers: { Authorization: `Bearer ${whatsappConfig.token}` },
    });

    const { data } = await axios.get(metadata.url, {
      headers: { Authorization: `Bearer ${whatsappConfig.token}` },
      responseType: "arraybuffer",
    });

    return Buffer.from(data);
  },
};
