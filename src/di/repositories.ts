import { RepositoryRepository } from '../modules/scanner/repositories/repository.repository.js';
import { SubscriptionRepository } from '../modules/subscription/repositories/subscription.repository.js';
import prisma from '../db/prisma.js';

export const repositoryRepository = new RepositoryRepository(prisma);
export const subscriptionRepository = new SubscriptionRepository(prisma);
