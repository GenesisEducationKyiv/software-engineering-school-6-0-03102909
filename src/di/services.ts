import { GithubService, CachedGithubClient } from '../shared/github/index.js';
import { ScannerService } from '../modules/scanner/index.js';
import { SubscriptionService } from '../modules/subscription/index.js';
import { NotificationClient } from '../shared/mailer/index.js';
import config from '../config/env.js';

import { redis, confirmationEmailQueue, logger } from './infrastructure.js';
import { repositoryRepository, subscriptionRepository } from './repositories.js';

export const rawGithubClient = new GithubService();
export const githubClient = new CachedGithubClient(redis, rawGithubClient, logger);

export const notificationService = new NotificationClient(
  config.NOTIFICATION_SERVICE_URL,
  logger
);

export const subscriptionService = new SubscriptionService(
  subscriptionRepository,
  githubClient,
  confirmationEmailQueue,
  logger,
);
export const scannerService = new ScannerService(
  repositoryRepository,
  githubClient,
  subscriptionRepository,
  notificationService,
  logger,
);
