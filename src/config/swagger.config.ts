import swaggerJsdoc from 'swagger-jsdoc'
import { env } from './env.config'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TikTok Live Sales API',
      version: '1.0.0',
      description: 'API RESTful para la gestión de ventas en vivo en TikTok',
    },
    servers: [
      {
        url: `http://localhost:${env.PORT || 8080}/api`,
        description: 'Servidor Local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/docs/*.yaml'],
}

export const swaggerSpec = swaggerJsdoc(options)
