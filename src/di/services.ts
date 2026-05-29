import { GithubService } from '../services/github.service.js';
import { CachedGithubClient } from '../services/cached-github.service.js';
import { MailerService } from '../services/mailer.service.js';
import { ScannerService } from '../services/scanner.service.js';
import { SubscriptionService } from '../services/subscription.service.js';

import { redis, resend, confirmationEmailQueue } from './infrastructure.js';
import { repositoryRepository, subscriptionRepository } from './repositories.js';

export const rawGithubClient = new GithubService();
export const githubClient = new CachedGithubClient(redis, rawGithubClient);
export const mailerService = new MailerService(resend);
export const subscriptionService = new SubscriptionService(
  subscriptionRepository,
  githubClient,
  confirmationEmailQueue,
);
export const scannerService = new ScannerService(
  repositoryRepository,
  githubClient,
  subscriptionRepository,
  mailerService,
);
