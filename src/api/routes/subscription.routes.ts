import { Router } from 'express';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { subscribeSchema, getSubscriptionsSchema } from '../../validation/subscription.schema.js';
import {
  subscribeController,
  confirmController,
  unsubscribeController,
  getSubscriptionsController,
} from '../controllers/subscription.controller.js';

const router = Router();

// POST /api/subscribe
router.post('/subscribe', validateRequest(subscribeSchema), subscribeController);

// GET /api/confirm/{token}
router.get('/confirm/:token', confirmController);

// GET /api/unsubscribe/{token}
router.get('/unsubscribe/:token', unsubscribeController);

// GET /api/subscriptions?email=...
router.get('/subscriptions', validateRequest(getSubscriptionsSchema), getSubscriptionsController);

export default router;
