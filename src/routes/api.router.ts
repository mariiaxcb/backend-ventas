import { Router } from 'express'
import authRoutes from './auth.routes'
import productoRoutes from './producto.routes'
import pedidoRoutes from './pedido.routes'
import comprobanteRoutes from './comprobante.routes'

const apiRouter = Router()

apiRouter.use('/auth', authRoutes)
apiRouter.use('/products', productoRoutes)
apiRouter.use('/orders', pedidoRoutes)
apiRouter.use('/receipts', comprobanteRoutes)

export default apiRouter
