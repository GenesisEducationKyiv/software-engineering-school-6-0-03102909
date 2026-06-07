import { Router } from 'express';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import { authMiddleware } from '../../../shared/middlewares/auth.middleware.js';
import {
  subscribeSchema,
  getSubscriptionsSchema,
  tokenParamSchema,
} from '../validation/subscription.schema.js';
import { subscribeRateLimiter } from '../../../shared/middlewares/rateLimit.middleware.js';
import {
  subscribeController,
  confirmController,
  unsubscribeController,
  getSubscriptionsController,
} from './subscription.controller.js';

const router = Router();

// POST /api/subscribe
router.post(
  '/subscribe',
  subscribeRateLimiter,
  validateRequest(subscribeSchema),
  subscribeController,
);

// GET /api/confirm/{token}
router.get('/confirm/:token', validateRequest(tokenParamSchema), confirmController);

// GET /api/unsubscribe/{token}
router.get('/unsubscribe/:token', validateRequest(tokenParamSchema), unsubscribeController);

// GET /api/subscriptions?email=...
router.get(
  '/subscriptions',
  authMiddleware,
  validateRequest(getSubscriptionsSchema),
  getSubscriptionsController,
);

export default router;
