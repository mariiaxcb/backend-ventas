import { Router } from 'express'
import { buyerController } from '@/controllers/buyer.controller'
import { verificarToken } from '@/middlewares/auth.middleware'

const router = Router()

router.use(verificarToken)

/**
 * @openapi
 * /buyers:
 *   get:
 *     summary: Listar compradores con opción de búsqueda
 *     tags:
 *       - Buyers
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de compradores
 */
router.get('/', buyerController.list)

/**
 * @openapi
 * /buyers/{id}:
 *   get:
 *     summary: Obtener detalle de un comprador y su historial de pedidos
 *     tags:
 *       - Buyers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle del comprador
 */
router.get('/:id', buyerController.getById)

/**
 * @openapi
 * /buyers/{id}:
 *   put:
 *     summary: Actualizar información de un comprador
 *     tags:
 *       - Buyers
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
 *             properties:
 *               clientName:
 *                 type: string
 *               whatsapp:
 *                 type: string
 *               tiktokUsername:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comprador actualizado exitosamente
 */
router.put('/:id', buyerController.update)

export default router
