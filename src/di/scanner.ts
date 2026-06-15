import { RepositoryRepository, ScannerService } from '../modules/scanner/index.js';
import prisma from '../db/prisma.js';
import { notificationQueue, logger } from './infrastructure.js';
import { githubClient } from './github.js';
import { subscriptionRepository } from './subscription.js';

export const repositoryRepository = new RepositoryRepository(prisma);
export const scannerService = new ScannerService(
  repositoryRepository,
  githubClient,
  subscriptionRepository,
  notificationQueue,
  logger,
);
