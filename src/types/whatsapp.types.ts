export interface WhatsappMensajeEntrante {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "image" | "document";
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string };
}

export interface WhatsappWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      field: string;
      value: {
        messaging_product: string;
        messages?: WhatsappMensajeEntrante[];
      };
    }>;
  }>;
}

export interface EnviarMensajeInput {
  to: string;
  mensaje: string;
}

export interface EnviarImagenInput {
  to: string;
  imagenUrl: string;
  caption?: string;
}
