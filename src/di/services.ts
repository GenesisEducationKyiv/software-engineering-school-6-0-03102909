import { GithubService, CachedGithubClient } from '../shared/github/index.js';
import { MailerService } from '../modules/notification/index.js';
import { ScannerService } from '../modules/scanner/index.js';
import { SubscriptionService } from '../modules/subscription/index.js';

import { redis, resend, confirmationEmailQueue, logger } from './infrastructure.js';
import { repositoryRepository, subscriptionRepository } from './repositories.js';

export const rawGithubClient = new GithubService();
export const githubClient = new CachedGithubClient(redis, rawGithubClient, logger);
export const mailerService = new MailerService(resend, logger);
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
  mailerService,
  logger,
);
