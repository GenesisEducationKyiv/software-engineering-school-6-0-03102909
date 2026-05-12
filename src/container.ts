import { repositoryRepository } from './repositories/repository.repository.js';
import { subscriptionRepository } from './repositories/subscription.repository.js';
import { RedisCacheProvider } from './db/cache.provider.js';
import { redis } from './db/redis.js';
import { ResendMailTransport } from './db/mail.transport.js';
import { Resend } from 'resend';
import config from './config/env.js';
import { GithubService } from './services/github.service.js';
import { MailerService } from './services/mailer.service.js';
import { ScannerService } from './services/scanner.service.js';
import { SubscriptionService } from './services/subscription.service.js';
import { NotificationService } from './services/notification.service.js';
import { EmailJobQueue } from './jobs/email.queue.js';
import boss from './jobs/boss.js';

const cacheProvider = new RedisCacheProvider(redis);
const resend = new Resend(config.RESEND_API_KEY);
const mailTransport = new ResendMailTransport(resend);

const emailJobQueue = new EmailJobQueue(boss);

const githubClient = new GithubService(cacheProvider);
const mailerService = new MailerService(mailTransport);
const subscriptionService = new SubscriptionService(
  subscriptionRepository,
  githubClient,
  emailJobQueue,
);
const notificationService = new NotificationService(subscriptionRepository, emailJobQueue);
const scannerService = new ScannerService(
  repositoryRepository,
  githubClient,
  notificationService,
);

export { boss, mailerService, githubClient, subscriptionService, scannerService };
