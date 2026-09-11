import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import { env } from '@/config/env.config'
import { conectarBaseDatos } from '@/config/database'
import { redis } from '@/config/redis'
import { inicializarSocket } from '@/websockets/socket.server'
import apiRouter from '@/routes/api.router'
import webhookRoutes from '@/routes/webhook.routes'
import { errorHandler, notFoundHandler } from '@/middlewares/error.middleware'
import { logger } from '@/utils/logger'

import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from '@/config/swagger.config'

import './queues/ocr.queue'
import './queues/whatsapp.queue'

const app = express()
const server = http.createServer(app)

// 1. Middlewares globales
app.use(helmet())
app.use(
  cors({
    origin: [env.FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 2. Inicialización ÚNICA de Socket.io
const io = inicializarSocket(server)
app.set('io', io)

// 3. Documentación Swagger y Healthcheck
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.get('/health', async (_req, res) => {
  try {
    const redisPing = await redis.ping()
    res.json({ status: 'ok', redis: redisPing })
  } catch (error) {
    res.status(500).json({ status: 'error', redis: 'disconnected' })
  }
})

// 4. Rutas
app.use('/api', apiRouter)
app.use('/webhooks', webhookRoutes)

// 5. Manejo de errores
app.use(notFoundHandler)
app.use(errorHandler)

// 6. Arranque del servidor
async function bootstrap() {
  await conectarBaseDatos()

  await redis.ping()
  logger.info('🔴 Conexión con Redis establecida correctamente')

  server.listen(env.PORT, () => {
    logger.info(`🚀 Servidor escuchando en el puerto ${env.PORT}`)
  })
}

bootstrap().catch((error) => {
  logger.error('Error al iniciar el servidor', { error })
  process.exit(1)
})

export default app