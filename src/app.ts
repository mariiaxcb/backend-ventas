import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import { env } from '@/config/env.config'
import { conectarBaseDatos } from '@/config/database'
import { inicializarSocket } from '@/websockets/socket.server'
import apiRouter from '@/routes/api.router'
import webhookRoutes from '@/routes/webhook.routes'
import { errorHandler, notFoundHandler } from '@/middlewares/error.middleware'
import { logger } from '@/utils/logger'

import './queues/ocr.queue'
import './queues/whatsapp.queue'

const app = express()
const server = http.createServer(app)

app.use(helmet())
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/v1', apiRouter)
app.use('/webhooks', webhookRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

inicializarSocket(server)

async function bootstrap() {
  await conectarBaseDatos()
  server.listen(env.PORT, () => {
    logger.info(`🚀 Servidor escuchando en el puerto ${env.PORT}`)
  })
}

bootstrap().catch((error) => {
  logger.error('Error al iniciar el servidor', { error })
  process.exit(1)
})

export default app
