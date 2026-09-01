import { Router } from 'express'
import { dashboardController } from '@/controllers/dashboard.controller'
import { verificarToken } from '@/middlewares/auth.middleware'

const router = Router()

router.use(verificarToken)

/**
 * @openapi
 * /dashboard/metrics:
 *   get:
 *     summary: Obtener métricas de ventas para una transmisión (Dashboard)
 *     tags:
 *       - Dashboard
 *     parameters:
 *       - in: query
 *         name: streamId
 *         schema:
 *           type: integer
 *         description: ID de la transmisión. Si se omite, busca la transmisión activa (LIVE).
 *     responses:
 *       200:
 *         description: Métricas del stream obtenidas exitosamente
 */
router.get('/metrics', dashboardController.getMetrics)

export default router
