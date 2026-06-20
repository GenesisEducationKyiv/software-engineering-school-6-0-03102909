import { SubscriptionRepository } from '../modules/subscription/index.js';
import { SubscriptionService } from '../modules/subscription/index.js';
import prisma from '../db/prisma.js';
import { notificationQueue, logger } from './infrastructure.js';
import { githubClient } from './github.js';

export const subscriptionRepository = new SubscriptionRepository(prisma);
export const subscriptionService = new SubscriptionService(
  subscriptionRepository,
  githubClient,
  notificationQueue,
  logger,
);
