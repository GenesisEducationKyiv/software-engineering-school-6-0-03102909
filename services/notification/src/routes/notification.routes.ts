import { Router } from 'express';
import {
  sendConfirmationController,
  sendReleaseController,
  healthController,
} from '../controllers/notification.controller.js';

const router = Router();

router.post('/send-confirmation', sendConfirmationController);
router.post('/send-release', sendReleaseController);
router.get('/health', healthController);

export default router;
