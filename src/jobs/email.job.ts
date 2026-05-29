import type { PgBoss } from 'pg-boss';
import type { MailerService } from '../services/mailer.service.js';
import { QUEUE_NAME } from './email.queue.js';
import type { ConfirmationEmailDto } from '../interfaces/infrastructure.interfaces.js';
import type { ILogger } from '../config/logger.js';

export async function registerEmailJob(
  boss: PgBoss,
  mailer: MailerService,
  logger: ILogger
): Promise<void> {
  const log = logger.child({ module: 'email-job' });

  await boss.createQueue(QUEUE_NAME);

  await boss.work<ConfirmationEmailDto>(QUEUE_NAME, async (jobs) => {
    for (const job of jobs) {
      log.debug({ jobId: job.id, to: job.data.to }, 'processing confirmation email job');
      try {
        await mailer.sendConfirmationEmail(job.data.to, job.data.repo, job.data.confirmToken);
      } catch (err) {
        log.error({ err, jobId: job.id, to: job.data.to }, 'failed to process confirmation email job');
        throw err;
      }
    }
  });

  log.info({ queue: QUEUE_NAME }, 'email job worker registered');
}
