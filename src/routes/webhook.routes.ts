import { Router } from 'express'
import { webhookController } from '@/controllers/webhook.controller'

const router = Router()

router.post('/canela-pay', webhookController.handleCanelaPay)

export default router
