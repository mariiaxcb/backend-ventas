import { Queue, Worker, type Job } from "bullmq";
import { redisConnection } from "@/config/redis";
import { whatsappService } from "@/services/whatsapp.service";
import { logger } from "@/utils/logger";

interface WhatsappJobData {
  to: string;
  mensaje?: string;
  imagenUrl?: string;
  caption?: string;
}

// Limiter evita exceder el rate limit de la Meta Cloud API.
export const whatsappQueue = new Queue<WhatsappJobData>("whatsapp", {
  connection: redisConnection,
});

export const whatsappWorker = new Worker<WhatsappJobData>(
  "whatsapp",
  async (job: Job<WhatsappJobData>) => {
    const { to, mensaje, imagenUrl, caption } = job.data;

    if (imagenUrl) {
      return whatsappService.enviarImagen({ to, imagenUrl, caption });
    }
    return whatsappService.enviarMensaje({ to, mensaje: mensaje ?? "" });
  },
  {
    connection: redisConnection,
    limiter: { max: 20, duration: 1000 }, // 20 mensajes / segundo máx.
  }
);

whatsappWorker.on("failed", (job, err) => {
  logger.error(`Job WhatsApp fallido (${job?.id})`, { error: err.message });
});

export async function encolarMensajeWhatsapp(data: WhatsappJobData) {
  return whatsappQueue.add("enviar-mensaje", data, {
    attempts: 5,
    backoff: { type: "exponential", delay: 3000 },
  });
}
