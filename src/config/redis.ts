import Redis from 'ioredis'
import { env } from '@/config/env.config'
import { logger } from '@/utils/logger'

export const redis = new Redis({
  host: env.REDIS_HOST || '127.0.0.1',
  port: Number(env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
})

redis.on('connect', () => {
  logger.info('🔴 Conectado exitosamente a Redis')
})

redis.on('error', (err) => {
  logger.error('❌ Error de conexión en Redis', { error: err })
})

// Alias para mantener compatibilidad con las colas (ocr.queue, whatsapp.queue)
export const redisConnection = redis