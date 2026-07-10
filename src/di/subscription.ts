import { SubscriptionRepository } from '../modules/subscription/index.js';
import { SubscriptionService } from '../modules/subscription/index.js';
import prisma from '../db/prisma.js';
import { logger } from './infrastructure.js';
import { githubClient } from './github.js';
import type { IConfirmationEmailQueue } from '../shared/queue.js';

export const subscriptionRepository = new SubscriptionRepository(prisma);

export function createSubscriptionService(jobQueue: IConfirmationEmailQueue): SubscriptionService {
  return new SubscriptionService(
    subscriptionRepository,
    githubClient,
    jobQueue,
    logger,
  );
}
