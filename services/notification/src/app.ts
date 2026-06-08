import { PgBoss } from 'pg-boss';
import type { Job } from 'pg-boss';
import type { Logger } from './config/logger.js';
import type { MailerService } from './services/mailer.service.js';

interface ConfirmationEmailDto {
  to: string;
  repo: string;
  confirmToken: string;
}

interface ReleaseNotificationDto {
  to: string;
  repo: string;
  tag: string;
  unsubscribeToken: string;
}

export async function startWorker(databaseUrl: string, mailer: MailerService, logger: Logger): Promise<PgBoss> {
  const boss = new PgBoss(databaseUrl);

  boss.on('error', (error: Error) => logger.error({ err: error }, 'pg-boss error'));

  await boss.start();
  logger.info('pg-boss worker started');

  await boss.work<ConfirmationEmailDto>('send-confirmation-email', async (jobs: Job<ConfirmationEmailDto>[]) => {
    for (const job of jobs) {
      logger.info({ jobId: job.id, to: job.data.to }, 'processing confirmation email');
      try {
        await mailer.sendConfirmationEmail(job.data.to, job.data.repo, job.data.confirmToken);
      } catch (err) {
        logger.error({ err, jobId: job.id }, 'failed to send confirmation email');
        throw err;
      }
    }
  });

  await boss.work<ReleaseNotificationDto>('send-release-notification', async (jobs: Job<ReleaseNotificationDto>[]) => {
    for (const job of jobs) {
      logger.info({ jobId: job.id, to: job.data.to }, 'processing release notification');
      try {
        await mailer.sendReleaseNotification(job.data.to, job.data.repo, job.data.tag, job.data.unsubscribeToken);
      } catch (err) {
        logger.error({ err, jobId: job.id }, 'failed to send release notification');
        throw err;
      }
    }
  });

  return boss;
}
