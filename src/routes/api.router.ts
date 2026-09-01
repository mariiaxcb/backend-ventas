import { Router } from 'express'
import authRoutes from './auth.routes'
import productRoutes from './product.routes'
import streamRoutes from './stream.routes'
import orderRoutes from './order.routes'
import messageRoutes from './message.routes'
import receiptRoutes from './receipt.routes'
import inventoryRoutes from './inventory.routes'
import dashboardRoutes from './dashboard.routes'

const apiRouter = Router()

apiRouter.use('/auth', authRoutes)
apiRouter.use('/products', productRoutes)
apiRouter.use('/streams', streamRoutes)
apiRouter.use('/orders', orderRoutes)
apiRouter.use('/messages', messageRoutes)
apiRouter.use('/receipts', receiptRoutes)
apiRouter.use('/inventory', inventoryRoutes)
apiRouter.use('/dashboard', dashboardRoutes)

export default apiRouter
