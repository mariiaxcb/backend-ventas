import { env } from "./env.config";

/**
 * Configuración base para la integración con la API del Banco Nacional de
 * Bolivia (BNB) — QR simple / verificación de transferencias.
 * El uso real de estas credenciales está en services/bnb.service.ts.
 */
export const bnbConfig = {
  baseUrl: env.BNB_API_BASE_URL,
  apiKey: env.BNB_API_KEY,
  accountId: env.BNB_ACCOUNT_ID,
  merchantId: env.BNB_MERCHANT_ID,
};

export function bnbConfigurado(): boolean {
  return Boolean(bnbConfig.apiKey && bnbConfig.accountId);
}
