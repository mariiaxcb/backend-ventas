import { Router } from "express";
import type { Request, Response } from "express";
import { whatsappConfig } from "@/config/whatsapp";
import { logger } from "@/utils/logger";
import type { WhatsappWebhookPayload } from "@/types/whatsapp.types";

const router = Router();

/** Verificación inicial del webhook exigida por Meta al configurar la app. */
router.get("/whatsapp", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === whatsappConfig.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/** Recepción de mensajes/eventos entrantes de WhatsApp (Meta Cloud API). */
router.post("/whatsapp", (req: Request, res: Response) => {
  const payload = req.body as WhatsappWebhookPayload;

  const mensajes = payload.entry?.[0]?.changes?.[0]?.value?.messages;
  if (mensajes?.length) {
    logger.info("Mensajes de WhatsApp recibidos", { cantidad: mensajes.length });
    // TODO: delegar a whatsapp.service para procesar el flujo de venta:
    // usuario TikTok + código + comprobante → validación → respuesta.
  }

  res.sendStatus(200);
});

export default router;
