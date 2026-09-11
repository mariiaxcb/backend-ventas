// src/routes/tiktok.routes.ts
import { Router } from 'express'
import { redis } from '@/config/redis' // O tu servicio de Redis

const router = Router()

// GET /api/postulantes (o /api/tiktok/postulantes)
router.get('/postulantes', async (req, res) => {
  try {
    // 1. Obtener la lista almacenada en Redis
    const data = await redis.lrange('postulantes:list', 0, 49)
    
    // 2. Parsear el JSON guardado de cada elemento
    const postulantes = data.map((item) => JSON.parse(item))

    return res.status(200).json(postulantes)
  } catch (error) {
    console.error('Error al obtener postulantes de Redis:', error)
    return res.status(500).json({ message: 'Error interno del servidor' })
  }
})

export default router