import { env } from "./env.config";

/**
 * Credenciales y configuración base del cliente Meta Cloud API (WhatsApp Business).
 * El envío/recepción real de mensajes vive en services/whatsapp.service.ts;
 * este archivo solo centraliza configuración y URLs.
 */
export const whatsappConfig = {
  apiVersion: "v20.0",
  baseUrl: "https://graph.facebook.com",
  token: env.WHATSAPP_TOKEN,
  phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
  verifyToken: env.WHATSAPP_VERIFY_TOKEN,
  businessAccountId: env.WHATSAPP_BUSINESS_ACCOUNT_ID,
};

export function whatsappEndpoint(path: string): string {
  return `${whatsappConfig.baseUrl}/${whatsappConfig.apiVersion}/${path}`;
}

export function whatsappConfigurado(): boolean {
  return Boolean(whatsappConfig.token && whatsappConfig.phoneNumberId);
}
