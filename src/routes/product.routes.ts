import { Router } from 'express'
import { productController } from '@/controllers/product.controller'
import { verificarToken } from '@/middlewares/auth.middleware'
import { uploadProductImage } from '@/config/cloudinary.config'

const router = Router()

router.use(verificarToken)

/**
 * @openapi
 * /products:
 *   get:
 *     summary: Listar productos con filtros
 *     tags:
 *       - Products
 *     parameters:
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *         description: Filtrar si tiene stock (> 0)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, OUT_OF_STOCK]
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de productos obtenida exitosamente
 *   post:
 *     summary: Crear un nuevo producto
 *     tags:
 *       - Products
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - stock
 *               - categoryName
 *             properties:
 *               name:
 *                 type: string
 *                 example: Polera Gamer RGB
 *               description:
 *                 type: string
 *                 example: 100% algodón peinado
 *               price:
 *                 type: number
 *                 example: 150.50
 *               stock:
 *                 type: integer
 *                 example: 20
 *               categoryName:
 *                 type: string
 *                 example: Ropa Urbana
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 */
router.get('/', productController.list)
router.post('/', uploadProductImage.single('image'), productController.create)

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     summary: Obtener producto por ID
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
 *       404:
 *         description: Producto no encontrado
 *   put:
 *     summary: Actualizar un producto
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
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
 *                 enum: [ACTIVE, INACTIVE, OUT_OF_STOCK]
 *               image:
 *                 type: string
 *                 format: binary
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
router.put('/:id', uploadProductImage.single('image'), productController.update)
router.delete('/:id', productController.delete)

export default router
