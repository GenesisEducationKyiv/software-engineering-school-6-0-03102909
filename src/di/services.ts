import { GithubService } from '../services/github.service.js';
import { MailerService } from '../services/mailer.service.js';
import { ScannerService } from '../services/scanner.service.js';
import { SubscriptionService } from '../services/subscription.service.js';
import { NotificationService } from '../services/notification.service.js';

import { cacheProvider, mailTransport, emailJobQueue } from './infrastructure.js';
import { repositoryRepository, subscriptionRepository } from './repositories.js';

export const githubClient = new GithubService(cacheProvider);
export const mailerService = new MailerService(mailTransport);
export const subscriptionService = new SubscriptionService(
  subscriptionRepository,
  githubClient,
  emailJobQueue,
);
export const notificationService = new NotificationService(subscriptionRepository, emailJobQueue);
export const scannerService = new ScannerService(
  repositoryRepository,
  githubClient,
  notificationService,
);
