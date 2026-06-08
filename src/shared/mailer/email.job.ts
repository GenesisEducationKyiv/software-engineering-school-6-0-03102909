import type { PgBoss } from 'pg-boss';
import type { INotificationService } from './interfaces.js';
import { QUEUE_NAME } from './email.queue.js';
import type { ConfirmationEmailDto } from './interfaces.js';
import type { Logger } from '../../config/logger.js';

export async function registerEmailJob(
  boss: PgBoss,
  notificationService: INotificationService,
  logger: Logger,
): Promise<void> {
  const log = logger.child({ module: 'email-job' });

  await boss.createQueue(QUEUE_NAME);

  await boss.work<ConfirmationEmailDto>(QUEUE_NAME, async (jobs) => {
    for (const job of jobs) {
      log.debug({ jobId: job.id, to: job.data.to }, 'processing confirmation email job');
      try {
        await notificationService.sendConfirmationEmail(job.data.to, job.data.repo, job.data.confirmToken);
      } catch (err) {
        log.error(
          { err, jobId: job.id, to: job.data.to },
          'failed to process confirmation email job',
        );
        throw err;
      }
    }
  });

  log.info({ queue: QUEUE_NAME }, 'email job worker registered');
}
