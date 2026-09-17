import crypto from 'crypto'
import { env } from '@/config/env.config'

export interface CreateQrInput {
  amount: number
  gloss: string
  expirationMinutes?: number
}

export interface CanelaQrResponse {
  id: string
  aliasRef: string
  merchantId: string
  amount: number
  currency: string
  gloss: string
  status: string
  qrImage: string
  paymentUrl: string
  callbackUrl: string
  expiresAt: string
}

export interface CanelaPaymentStatus {
  id: string
  aliasRef: string
  status: string
  amount: number
}

export const canelaBankService = {
  async generateQr(data: CreateQrInput): Promise<CanelaQrResponse> {
    const response = await fetch(
      `${env.CANELA_BANK_API_URL}/api/v1/payments/qr`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.CANELA_BANK_API_KEY,
        },
        body: JSON.stringify({
          amount: data.amount,
          currency: 'BOB',
          gloss: data.gloss,
          expirationMinutes: data.expirationMinutes || 5,
          callbackUrl: `${env.APP_BASE_URL}/api/webhooks/canela-pay`,
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Canela Bank API error: ${response.statusText}`)
    }

    const dataJson = (await response.json()) as CanelaQrResponse
    return dataJson
  },

  async getPaymentStatus(aliasRef: string): Promise<CanelaPaymentStatus> {
    const response = await fetch(
      `${env.CANELA_BANK_API_URL}/api/v1/payments/${aliasRef}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': env.CANELA_BANK_API_KEY,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Canela Bank API error: ${response.statusText}`)
    }

    const dataJson = (await response.json()) as CanelaPaymentStatus
    return dataJson
  },

  verifySignature(payload: any, signatureHeader: string): boolean {
    const serializedPayload = JSON.stringify(payload)
    const expectedSignature = crypto
      .createHmac('sha256', env.CANELA_WEBHOOK_SECRET)
      .update(serializedPayload)
      .digest('hex')

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signatureHeader, 'utf8'),
        Buffer.from(expectedSignature, 'utf8'),
      )
    } catch {
      return false
    }
  },
}
