import Redis from 'ioredis'
import { env } from './env.config'

export const redisConnection = {
  host: env.REDIS_HOST,
  port: Number(env.REDIS_PORT),
  password: env.REDIS_PASSWORD || undefined,
}

export const redisClient = new Redis(redisConnection)

redisClient.on('connect', () => {
  console.log('✅ Redis conectado')
})

redisClient.on('error', (err) => {
  console.error('❌ Error de Redis:', err.message)
})
