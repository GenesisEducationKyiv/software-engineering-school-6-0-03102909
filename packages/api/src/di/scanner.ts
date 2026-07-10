import { RepositoryRepository, ScannerService } from '../modules/scanner/index.js';
import prisma from '../db/prisma.js';
import { logger } from './infrastructure.js';
import { githubClient } from './github.js';
import { subscriptionRepository } from './subscription.js';
import type { IReleaseNotificationQueue } from '../shared/queue.js';

export const repositoryRepository = new RepositoryRepository(prisma);

export function createScannerService(releaseQueue: IReleaseNotificationQueue): ScannerService {
  return new ScannerService(
    repositoryRepository,
    githubClient,
    subscriptionRepository,
    releaseQueue,
    logger,
  );
}
