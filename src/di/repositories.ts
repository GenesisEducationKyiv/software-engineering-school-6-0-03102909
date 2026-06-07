import { RepositoryRepository } from '../modules/scanner/index.js';
import { SubscriptionRepository } from '../modules/subscription/index.js';
import prisma from '../db/prisma.js';

export const repositoryRepository = new RepositoryRepository(prisma);
export const subscriptionRepository = new SubscriptionRepository(prisma);
