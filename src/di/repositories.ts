import { RepositoryRepository } from '../repositories/repository.repository.js';
import { SubscriptionRepository } from '../repositories/subscription.repository.js';
import prisma from '../db/prisma.js';

export const repositoryRepository = new RepositoryRepository(prisma);
export const subscriptionRepository = new SubscriptionRepository(prisma);
