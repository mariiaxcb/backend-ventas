import { Router } from 'express'
import { receiptController } from '@/controllers/receipt.controller'
import { uploadReceiptImage } from '@/config/cloudinary.config'
import { verificarToken } from '@/middlewares/auth.middleware'

const router = Router()

router.use(verificarToken)

/**
 * @openapi
 * /receipts/{orderId}/upload:
 *   post:
 *     summary: Subir imagen de comprobante de pago
 *     tags:
 *       - Receipts
 *     parameters:
 *       - in: path
 *         name: orderId
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
 *               extractedAmount:
 *                 type: number
 *                 example: 301.00
 *     responses:
 *       201:
 *         description: Comprobante subido y orden pasada a IN_REVIEW
 */
router.post(
  '/:orderId/upload',
  uploadReceiptImage.single('image'),
  receiptController.upload,
)

/**
 * @openapi
 * /receipts/{orderId}:
 *   get:
 *     summary: Obtener comprobante de una orden
 *     tags:
 *       - Receipts
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comprobante encontrado
 */
router.get('/:orderId', receiptController.getByOrderId)

/**
 * @openapi
 * /receipts/{orderId}/validate:
 *   patch:
 *     summary: Validar o rechazar un comprobante (descuenta stock y registra auditoría si es VALIDATED)
 *     tags:
 *       - Receipts
 *     parameters:
 *       - in: path
 *         name: orderId
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
 *                 enum: [VALIDATED, REJECTED]
 *                 example: VALIDATED
 *     responses:
 *       200:
 *         description: Comprobante y orden actualizados exitosamente
 */
router.patch('/:orderId/validate', receiptController.validate)

export default router
