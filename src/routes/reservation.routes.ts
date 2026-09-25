import { Router } from 'express'
import { reservationController } from '@/controllers/reservation.controller'
import { verificarToken } from '@/middlewares/auth.middleware'

const router = Router()

router.use(verificarToken)

/**
 * @openapi
 * /reservations:
 *   post:
 *     summary: Registrar una reserva de producto por comentario en TikTok Live
 *     tags:
 *       - Reservations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tiktokUsername
 *               - productCode
 *               - timestamp
 *             properties:
 *               tiktokUsername:
 *                 type: string
 *                 example: juanperez_live
 *               productCode:
 *                 type: string
 *                 example: CAM-AZUL-01
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-09-15T18:00:00Z"
 *     responses:
 *       201:
 *         description: Reserva registrada exitosamente
 */
router.post('/', reservationController.create)

/**
 * @openapi
 * /reservations/active:
 *   get:
 *     summary: Listar las reservas del stream activo actualmente
 *     tags:
 *       - Reservations
 *     responses:
 *       200:
 *         description: Reservas de la transmisión activa
 *       404:
 *         description: No hay ningún stream activo actualmente
 */
router.get('/active', reservationController.listByActiveStream)

export default router
