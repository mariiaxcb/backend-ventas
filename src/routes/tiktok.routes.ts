import { Router } from 'express';
import {
  iniciarMonitoreoTikTok,
  detenerMonitoreoTikTok,
} from '@/controllers/tiktok.controller';
import { verificarToken } from '@/middlewares/auth.middleware';

const router = Router();

router.use(verificarToken);

// Endpoint POST /api/tiktok/iniciar
router.post('/iniciar', iniciarMonitoreoTikTok);

// Endpoint POST /api/tiktok/detener
router.post('/detener', detenerMonitoreoTikTok);

export default router;
