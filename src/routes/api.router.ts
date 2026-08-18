import { Router } from 'express'
import authRoutes from './auth.routes'
import productoRoutes from './product.routes'
import orderRoutes from './order.routes'
import comprobanteRoutes from './comprobante.routes'
import streamRoutes from './stream.routes'

const apiRouter = Router()

apiRouter.use('/auth', authRoutes)
apiRouter.use('/products', productoRoutes)
apiRouter.use('/streams', streamRoutes)
apiRouter.use('/orders', orderRoutes)
apiRouter.use('/receipts', comprobanteRoutes)

export default apiRouter
