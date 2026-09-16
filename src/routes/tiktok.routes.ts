import { Router } from 'express';
import { iniciarMonitoreoTikTok } from '@/controllers/tiktok.controller';

const router = Router();

// Endpoint POST /api/tiktok/iniciar
router.post('/iniciar', iniciarMonitoreoTikTok);

export default router;