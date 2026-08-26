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
 *             properties:
 *               title:
 *                 type: string
 *                 example: Gran Venta Nocturna TikTok
 *     responses:
 *       201:
 *         description: Transmisión iniciada exitosamente
 */
router.get('/', streamController.list)
router.post('/', streamController.create)

/**
 * @openapi
 * /streams/active:
 *   get:
 *     summary: Obtener la transmisión en vivo activa
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
 *     summary: Finalizar una transmisión en vivo
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

export default router
