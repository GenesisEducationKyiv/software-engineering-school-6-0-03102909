import { GithubService } from '../shared/github/github.service.js';
import { CachedGithubClient } from '../shared/github/cached-github.service.js';
import { MailerService } from '../modules/notification/services/mailer.service.js';
import { ScannerService } from '../modules/scanner/services/scanner.service.js';
import { SubscriptionService } from '../modules/subscription/services/subscription.service.js';

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
