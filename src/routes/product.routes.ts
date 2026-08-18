import { Router } from 'express'
import { productController } from '@/controllers/product.controller'
import { verificarToken } from '@/middlewares/auth.middleware'
import { uploadProductImage } from '@/config/cloudinary.config'

const router = Router()

router.use(verificarToken)

router.get('/', productController.list)
router.get('/:id', productController.getById)
router.post('/', uploadProductImage.single('image'), productController.create)
router.put('/:id', uploadProductImage.single('image'), productController.update)
router.delete('/:id', productController.delete)

export default router
