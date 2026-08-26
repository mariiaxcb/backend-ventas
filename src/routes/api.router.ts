import { Router } from 'express'
import authRoutes from './auth.routes'
import productRoutes from './product.routes'
import streamRoutes from './stream.routes'
import orderRoutes from './order.routes'
import messageRoutes from './message.routes'
import comprobanteRoutes from './comprobante.routes'

const apiRouter = Router()

apiRouter.use('/auth', authRoutes)
apiRouter.use('/products', productRoutes)
apiRouter.use('/streams', streamRoutes)
apiRouter.use('/orders', orderRoutes)
apiRouter.use('/messages', messageRoutes)
apiRouter.use('/receipts', comprobanteRoutes)

export default apiRouter
