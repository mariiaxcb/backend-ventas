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

/**
 * @openapi
 * /dashboard/summary:
 *   get:
 *     summary: Resumen de la transmisión activa (se muestra al finalizar el live)
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Resumen obtenido exitosamente
 *       404:
 *         description: No hay ninguna transmisión activa
 */
router.get('/summary', dashboardController.getSummaryActive)

/**
 * @openapi
 * /dashboard/summary/{streamId}:
 *   get:
 *     summary: Resumen de una transmisión específica
 *     tags:
 *       - Dashboard
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la transmisión finalizada.
 *     responses:
 *       200:
 *         description: Resumen obtenido exitosamente
 *       404:
 *         description: La transmisión no existe
 */
router.get('/summary/:streamId', dashboardController.getSummary)

export default router
