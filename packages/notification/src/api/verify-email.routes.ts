import { Router } from 'express';
import { verifyEmailController } from './verify-email.controller.js';

const router = Router();

router.post('/verify-email', verifyEmailController);

export default router;
