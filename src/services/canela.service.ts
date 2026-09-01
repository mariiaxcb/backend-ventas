import { AppError } from '@/middlewares/error.middleware'

const CANELA_API_URL = process.env.CANELA_API_URL || 'http://localhost:3000'

export interface CreateQrPayload {
  amount: number
  gloss: string
}

export interface CanelaQrResponse {
  message: string
  payment: {
    id: string
    qrId: string
    amount: string
    currency: string
    gloss: string
    status: string
    transactionId: string | null
    createdAt: string
    updatedAt: string
  }
}

export interface CanelaStatusResponse {
  qrId: string
  status: 'PENDING' | 'PAID'
  amount: string
  gloss: string
  transactionId: string | null
  updatedAt: string
}

export const canelaService = {
  generateQr: async (payload: CreateQrPayload): Promise<CanelaQrResponse> => {
    const response = await fetch(`${CANELA_API_URL}/api/payments/qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new AppError('Failed to generate QR from Canela API', 502)
    }

    return (await response.json()) as CanelaQrResponse
  },

  getPaymentStatus: async (qrId: string): Promise<CanelaStatusResponse> => {
    const response = await fetch(
      `${CANELA_API_URL}/api/payments/${qrId}/status`,
      {
        method: 'GET',
      },
    )

    if (!response.ok) {
      throw new AppError('Failed to fetch payment status from Canela API', 502)
    }

    return (await response.json()) as CanelaStatusResponse
  },
}
