import { Router } from 'express'
import { streamController } from '@/controllers/stream.controller'
import { verificarToken } from '@/middlewares/auth.middleware'

const router = Router()

router.use(verificarToken)

router.get('/', streamController.list)
router.get('/active', streamController.getActive)
router.get('/:id', streamController.getById)
router.post('/', streamController.create)
router.put('/:id/end', streamController.endStream)

export default router
