import { SubscriptionRepository } from '../modules/subscription/index.js';
import { SubscriptionService } from '../modules/subscription/index.js';
import prisma from '../db/prisma.js';
import { logger } from './infrastructure.js';
import { githubClient } from './github.js';
import type { IConfirmationEmailQueue } from '../shared/queue.js';
import { createSubscriptionSagaHandler } from '../modules/subscription/services/subscription.saga.js';
import { GrpcEmailVerificationClient } from '../shared/email-verification/email-verification-grpc.client.js';
import config from '../config/env.js';

export const subscriptionRepository = new SubscriptionRepository(prisma);

export const subscriptionSagaHandler = createSubscriptionSagaHandler(
  subscriptionRepository,
  logger,
);

const emailVerificationClient = new GrpcEmailVerificationClient(
  config.NOTIFICATION_GRPC_URL,
  config.NOTIFICATION_GRPC_TIMEOUT_MS
);

export function createSubscriptionService(jobQueue: IConfirmationEmailQueue): SubscriptionService {
  return new SubscriptionService(
    subscriptionRepository,
    githubClient,
    jobQueue,
    emailVerificationClient,
    logger,
  );
}
