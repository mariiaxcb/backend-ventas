import { Router } from "express";
import { pedidoController } from "@/controllers/pedido.controller";
import { comprobanteController } from "@/controllers/comprobante.controller";
import { verificarToken } from "@/middlewares/auth.middleware";
import { uploadComprobante } from "@/middlewares/upload.middleware";

const router = Router();

router.use(verificarToken);

router.get("/", pedidoController.listar);
router.get("/:id", pedidoController.obtener);
router.post("/", pedidoController.crear);
router.patch("/:id/validar", pedidoController.validar);

router.post(
  "/:pedidoId/comprobante",
  uploadComprobante.single("comprobante"),
  comprobanteController.subir
);
router.post("/:pedidoId/comprobante/verificar-bnb", comprobanteController.verificarConBnb);
router.post("/:pedidoId/qr-bnb", comprobanteController.generarQrBnb);

export default router;
