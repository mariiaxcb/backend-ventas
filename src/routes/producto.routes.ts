import { Router } from "express";
import { productoController } from "@/controllers/producto.controller";
import { verificarToken } from "@/middlewares/auth.middleware";

const router = Router();

router.use(verificarToken);

router.get("/", productoController.listar);
router.get("/:id", productoController.obtener);
router.post("/", productoController.crear);
router.put("/:id", productoController.actualizar);
router.delete("/:id", productoController.eliminar);

export default router;
