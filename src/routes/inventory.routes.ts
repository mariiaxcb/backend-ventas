import { Router } from 'express'
import { inventoryController } from '@/controllers/inventory.controller'
import { verificarToken } from '@/middlewares/auth.middleware'

const router = Router()

router.use(verificarToken)

/**
 * @openapi
 * /inventory/product/{productId}:
 *   get:
 *     summary: Obtener historial de movimientos de stock de un producto
 *     tags:
 *       - Inventory
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Historial de inventario obtenido
 */
router.get('/product/:productId', inventoryController.listByProduct)

/**
 * @openapi
 * /inventory/movement:
 *   post:
 *     summary: Registrar un movimiento manual de stock (IN, OUT, ADJUSTMENT)
 *     tags:
 *       - Inventory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *               - movementType
 *             properties:
 *               productId:
 *                 type: integer
 *                 example: 1
 *               quantity:
 *                 type: integer
 *                 example: 10
 *               movementType:
 *                 type: string
 *                 enum: [IN, OUT, ADJUSTMENT]
 *                 example: IN
 *     responses:
 *       201:
 *         description: Movimiento registrado y stock actualizado
 */
router.post('/movement', inventoryController.createMovement)

export default router
