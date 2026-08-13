import { Router } from "express";
import authRoutes from "./auth.routes";
import productoRoutes from "./producto.routes";
import pedidoRoutes from "./pedido.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/productos", productoRoutes);
router.use("/pedidos", pedidoRoutes);

export default router;
