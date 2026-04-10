import { Router } from 'express';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { subscribeSchema } from '../../validation/subscription.schema.js';
import { subscribeController } from '../controllers/subscription.controller.js';

const router = Router();

router.post('/subscribe', validateRequest(subscribeSchema), subscribeController);

router.get('/confirm/:token', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

router.get('/unsubscribe/:token', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

router.get('/subscriptions', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

export default router;
