import { Router } from 'express'
import { orderController } from '@/controllers/order.controller'
import { verificarToken } from '@/middlewares/auth.middleware'
import upload from '@/middlewares/upload.middleware'

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
 *         description: Lista de pedidos obtenida exitosamente
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
 *                 example: "Juan Perez"
 *               whatsapp:
 *                 type: string
 *                 example: "+59178912345"
 *               tiktokUsername:
 *                 type: string
 *                 example: "juanperez_live"
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
 *                       example: 2
 *                     quantity:
 *                       type: integer
 *                       example: 1
 *     responses:
 *       201:
 *         description: Pedido registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 15
 *                     totalPrice:
 *                       type: string
 *                       example: "180.00"
 *                     status:
 *                       type: string
 *                       example: "PENDING"
 *                     buyerId:
 *                       type: integer
 *                       example: 3
 *                     streamId:
 *                       type: integer
 *                       example: 1
 *                     buyer:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         clientName:
 *                           type: string
 *                         whatsapp:
 *                           type: string
 *                         tiktokUsername:
 *                           type: string
 *                     orderItems:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           productId:
 *                             type: integer
 *                           quantity:
 *                             type: integer
 *                           unitPrice:
 *                             type: string
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrImage:
 *                       type: string
 *                       example: "data:image/png;base64,iVBORw0KGgoAAA..."
 *                     qrUrl:
 *                       type: string
 *                       example: "https://bank.canela.dev/pay/tx_123"
 *                     transactionId:
 *                       type: string
 *                       example: "tx_123"
 *                     amount:
 *                       type: string
 *                       example: "180.00"
 */
router.post('/:id/generate-qr', orderController.generateQr)

/**
 * @openapi
 * /orders/{id}/sync-payment:
 *   post:
 *     summary: Sincronizar el estado del pago con Canela API Bank
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
 *         description: Sincronización completa
 */
router.post('/:id/sync-payment', orderController.syncPayment)

/**
 * @openapi
 * /orders/{id}/receipt:
 *   post:
 *     summary: Subir comprobante de pago y procesar validación para la orden
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Comprobante subido y orden procesada exitosamente
 */
router.post(
  '/:id/receipt',
  upload.single('image'),
  orderController.uploadReceipt,
)

export default router
