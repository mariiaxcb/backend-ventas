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

/**
 * @openapi
 * /reservations/pending:
 *   get:
 *     summary: Buscar la reserva pendiente de un comprador por su usuario de TikTok
 *     description: >
 *       Lo usa el bot para resolver "Cancelar Reserva": el cliente no conoce
 *       el id de la reserva, solo el usuario con el que reservo.
 *     tags:
 *       - Reservations
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         example: rashad_barra
 *     responses:
 *       200:
 *         description: Reserva pendiente, o null si no tiene ninguna
 */
router.get('/pending', reservationController.findPendingByUsername)

/**
 * @openapi
 * /reservations/{id}:
 *   delete:
 *     summary: Cancelar una reserva (y su orden asociada si sigue sin cobrar)
 *     description: >
 *       Cancelación a pedido del comprador. Emite `reserva:cancelada` para que el
 *       panel del vendedor se entere al instante. Si la orden ya fue cobrada
 *       no se toca: el pago es del vendedor y ya fue validado.
 *     tags:
 *       - Reservations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 12
 *     responses:
 *       200:
 *         description: Reserva cancelada
 *       400:
 *         description: La reserva ya no está pendiente
 *       404:
 *         description: La reserva no existe
 */
router.delete('/:id', reservationController.cancelById)

export default router
