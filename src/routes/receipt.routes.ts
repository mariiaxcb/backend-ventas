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
 *     summary: Subir imagen de comprobante de pago para una orden
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
 *         description: Comprobante subido exitosamente y orden cambiada a IN_REVIEW
 *       400:
 *         description: Archivo no proporcionado
 *       404:
 *         description: Orden no encontrada
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
 *     summary: Obtener el comprobante de pago de una orden
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
 *       404:
 *         description: Comprobante no encontrado
 */
router.get('/:orderId', receiptController.getByOrderId)

export default router
