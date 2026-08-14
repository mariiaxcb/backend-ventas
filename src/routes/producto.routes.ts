import { Router } from 'express'
import { productoController } from '@/controllers/producto.controller'
import { verificarToken } from '@/middlewares/auth.middleware'
import { uploadProductImage } from '@/config/cloudinary.config'

const router = Router()

router.use(verificarToken)

router.get('/', productoController.listar)
router.get('/:id', productoController.obtener)
router.post('/', uploadProductImage.single('image'), productoController.crear)
router.put(
  '/:id',
  uploadProductImage.single('image'),
  productoController.actualizar,
)
router.delete('/:id', productoController.eliminar)

export default router
