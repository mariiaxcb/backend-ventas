import { Router } from 'express'
import { streamController } from '@/controllers/stream.controller'
import { verificarToken } from '@/middlewares/auth.middleware'

const router = Router()

router.use(verificarToken)

/**
 * @openapi
 * /streams:
 *   get:
 *     summary: Listar todas las transmisiones
 *     tags:
 *       - Streams
 *     responses:
 *       200:
 *         description: Historial de transmisiones
 *   post:
 *     summary: Iniciar una transmisión en vivo
 *     tags:
 *       - Streams
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - tiktokUsername
 *             properties:
 *               title:
 *                 type: string
 *               tiktokUsername:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transmisión iniciada
 */
router.get('/', streamController.list)
router.post('/', streamController.create)

/**
 * @openapi
 * /streams/active:
 *   get:
 *     summary: Obtener la transmisión activa
 *     tags:
 *       - Streams
 *     responses:
 *       200:
 *         description: Transmisión activa encontrada
 */
router.get('/active', streamController.getActive)

/**
 * @openapi
 * /streams/{id}:
 *   get:
 *     summary: Obtener detalle de transmisión por ID
 *     tags:
 *       - Streams
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle de la transmisión
 */
router.get('/:id', streamController.getById)

/**
 * @openapi
 * /streams/{id}/end:
 *   put:
 *     summary: Finalizar una transmisión
 *     tags:
 *       - Streams
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transmisión finalizada exitosamente
 */
router.put('/:id/end', streamController.endStream)

/**
 * @openapi
 * /streams/{id}/products:
 *   post:
 *     summary: Agregar un producto a una transmisión en vivo
 *     tags:
 *       - Streams
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productCode
 *             properties:
 *               productCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Producto agregado
 */
router.post('/:id/products', streamController.addProduct)

/**
 * @openapi
 * /streams/{id}/products/{productCode}:
 *   delete:
 *     summary: Remover un producto de una transmisión en vivo
 *     tags:
 *       - Streams
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: productCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Producto removido
 */
router.delete('/:id/products/:productCode', streamController.removeProduct)

export default router
