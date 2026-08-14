import { Router } from 'express'
import { comprobanteController } from '@/controllers/comprobante.controller'
import { uploadReceiptImage } from '@/config/cloudinary.config'
import { verificarToken } from '@/middlewares/auth.middleware'

const router = Router()

router.use(verificarToken)

router.post(
  '/:pedidoId/upload',
  uploadReceiptImage.single('receipt'),
  comprobanteController.subir,
)

router.post('/:pedidoId/verify-bnb', comprobanteController.verificarConBnb)
router.get('/:pedidoId/qr', comprobanteController.generarQrBnb)

export default router
