import { Router } from 'express'
import { orderController } from '@/controllers/order.controller'
import { verificarToken } from '@/middlewares/auth.middleware'

const router = Router()

router.use(verificarToken)

router.get('/', orderController.list)
router.get('/:id', orderController.getById)
router.post('/', orderController.create)
router.patch('/:id/status', orderController.updateStatus)

export default router
