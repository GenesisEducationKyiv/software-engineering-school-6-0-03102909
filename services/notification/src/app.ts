import { PgBoss } from 'pg-boss';
import type { Logger } from './config/logger.js';
import type { MailerService } from './services/mailer.service.js';
import { createConfirmationEmailHandler } from './handlers/confirmation-email.handler.js';
import { createReleaseNotificationHandler } from './handlers/release-notification.handler.js';

export async function startWorker(databaseUrl: string, mailer: MailerService, logger: Logger): Promise<PgBoss> {
  const boss = new PgBoss(databaseUrl);

  boss.on('error', (error: Error) => logger.error({ err: error }, 'pg-boss error'));

  await boss.start();
  logger.info('pg-boss worker started');

  await boss.work('send-confirmation-email', createConfirmationEmailHandler(mailer, logger));
  await boss.work('send-release-notification', createReleaseNotificationHandler(mailer, logger));

  return boss;
}
