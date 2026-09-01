import { Router } from 'express'
import { orderController } from '@/controllers/order.controller'
import { verificarToken } from '@/middlewares/auth.middleware'

const router = Router()

router.use(verificarToken)

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: Listar pedidos con filtros
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: query
 *         name: streamId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_REVIEW, PAID, REJECTED, DELIVERED, CANCELLED]
 *       - in: query
 *         name: buyerId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de pedidos
 *   post:
 *     summary: Crear un nuevo pedido
 *     tags:
 *       - Orders
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientName
 *               - whatsapp
 *               - items
 *             properties:
 *               clientName:
 *                 type: string
 *                 example: Juan Perez
 *               whatsapp:
 *                 type: string
 *                 example: "+59178912345"
 *               tiktokUsername:
 *                 type: string
 *                 example: juanperez_live
 *               streamId:
 *                 type: integer
 *                 example: 1
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *     responses:
 *       201:
 *         description: Pedido registrado exitosamente
 */
router.get('/', orderController.list)
router.post('/', orderController.create)

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     summary: Obtener pedido por ID
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle del pedido
 */
router.get('/:id', orderController.getById)

/**
 * @openapi
 * /orders/{id}/status:
 *   patch:
 *     summary: Actualizar estado de un pedido
 *     tags:
 *       - Orders
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
 *                 enum: [PENDING, IN_REVIEW, PAID, REJECTED, DELIVERED, CANCELLED]
 *                 example: PAID
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 */
router.patch('/:id/status', orderController.updateStatus)

/**
 * @openapi
 * /orders/{id}/generate-qr:
 *   post:
 *     summary: Generar un QR de cobro para una orden usando Canela API Bank
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: QR generado y asignado a la orden
 */
router.post('/:id/generate-qr', orderController.generateQr)

/**
 * @openapi
 * /orders/{id}/sync-payment:
 *   post:
 *     summary: Sincronizar el estado del pago con Canela API Bank (valida si se pagó el QR)
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sincronización completa (Actualiza inventario y estado si el pago fue exitoso)
 */
router.post('/:id/sync-payment', orderController.syncPayment)

export default router
