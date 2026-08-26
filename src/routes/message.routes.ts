import { Router } from 'express'
import { messageController } from '@/controllers/message.controller'
import { verificarToken } from '@/middlewares/auth.middleware'

const router = Router()

router.use(verificarToken)

/**
 * @openapi
 * /messages:
 *   post:
 *     summary: Registrar un mensaje del cliente o vendedor asociado a una orden
 *     tags:
 *       - Messages
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - content
 *             properties:
 *               orderId:
 *                 type: integer
 *                 example: 1
 *               content:
 *                 type: string
 *                 example: "Hola, ya hice el pago mediante QR, adjunto captura"
 *               status:
 *                 type: string
 *                 enum: [SENT, DELIVERED, READ, FAILED]
 *                 example: SENT
 *     responses:
 *       201:
 *         description: Mensaje guardado exitosamente
 */
router.post('/', messageController.create)

/**
 * @openapi
 * /messages/order/{orderId}:
 *   get:
 *     summary: Obtener historial de mensajes de una orden
 *     tags:
 *       - Messages
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de mensajes de la orden
 */
router.get('/order/:orderId', messageController.listByOrder)

/**
 * @openapi
 * /messages/{id}/status:
 *   patch:
 *     summary: Actualizar estado de entrega o lectura de un mensaje
 *     tags:
 *       - Messages
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [SENT, DELIVERED, READ, FAILED]
 *                 example: READ
 *     responses:
 *       200:
 *         description: Estado del mensaje actualizado
 */
router.patch('/:id/status', messageController.updateStatus)

export default router
