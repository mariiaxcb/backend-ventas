import { Router } from 'express'
import { authController } from '@/controllers/auth.controller'

const router = Router()

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión de administrador
 *     tags:
 *       - Auth
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: Admin
 *               password:
 *                 type: string
 *                 example: Admin
 *     responses:
 *       200:
 *         description: Login exitoso
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', authController.login)

export default router
