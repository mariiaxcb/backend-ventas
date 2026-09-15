import { Router } from 'express'
import { productController } from '@/controllers/product.controller'
import { verificarToken } from '@/middlewares/auth.middleware'
import upload from '@/middlewares/upload.middleware'

const router = Router()

router.use(verificarToken)

/**
 * @openapi
 * /products:
 *   get:
 *     summary: Listar productos con filtros opcionales
 *     tags:
 *       - Products
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de productos obtenida correctamente
 *   post:
 *     summary: Crear un nuevo producto con código único
 *     tags:
 *       - Products
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - price
 *               - stock
 *               - categoryName
 *             properties:
 *               code:
 *                 type: string
 *                 example: CAM-AZUL-01
 *               name:
 *                 type: string
 *                 example: Camisa Oversize Azul
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *                 example: 99.99
 *               stock:
 *                 type: integer
 *                 example: 25
 *               categoryName:
 *                 type: string
 *                 example: Camisas
 *               imageUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 */
router.get('/', productController.list)
router.post('/', upload.single('image'), productController.create)

/**
 * @openapi
 * /products/categories:
 *   get:
 *     summary: Obtener todas las categorías con conteo de productos
 *     tags:
 *       - Products
 *     responses:
 *       200:
 *         description: Lista de categorías
 */
router.get('/categories', productController.getCategories)

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     summary: Obtener detalle de un producto por ID
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle del producto
 *   put:
 *     summary: Actualizar un producto existente (incluyendo código, stock, etc.)
 *     tags:
 *       - Products
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
 *               code:
 *                 type: string
 *                 example: CAM-AZUL-02
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               categoryName:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Producto actualizado exitosamente
 *   delete:
 *     summary: Eliminar un producto
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Producto eliminado exitosamente
 */
router.get('/:id', productController.getById)
router.put('/:id', upload.single('image'), productController.update)
router.delete('/:id', productController.delete)

export default router
