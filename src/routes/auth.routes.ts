import { Router } from 'express'
import { authController } from '@/controllers/auth.controller'
import { verificarToken } from '@/middlewares/auth.middleware'

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
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: eleenaber@gmail.com
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

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Solicitar correo de recuperacion de contrasena
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
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@correo.com
 *     responses:
 *       200:
 *         description: Se envio el correo de recuperacion (respuesta generica)
 *       400:
 *         description: El correo no tiene un formato valido
 */
router.post('/forgot-password', authController.forgotPassword)

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Cambiar la contrasena con el token de recuperacion
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
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token recibido por correo.
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: Nueva contrasena (minimo 8 caracteres).
 *     responses:
 *       200:
 *         description: Contrasena actualizada correctamente
 *       400:
 *         description: Token invalido, expirado o contrasena debil
 */
router.post('/reset-password', authController.resetPassword)

router.get('/profile', verificarToken, authController.getProfile)
router.put('/profile', verificarToken, authController.updateProfile)

export default router
