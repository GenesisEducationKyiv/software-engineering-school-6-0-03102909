import type { Job } from 'pg-boss';
import type { Logger } from '../config/logger.js';
import type { MailerService } from '../services/mailer.service.js';
import type { ReleaseNotificationDto } from '../dto/release-notification.dto.js';

export function createReleaseNotificationHandler(mailer: MailerService, logger: Logger) {
  return async (jobs: Job<ReleaseNotificationDto>[]) => {
    for (const job of jobs) {
      logger.info({ jobId: job.id, to: job.data.to }, 'processing release notification');
      try {
        await mailer.sendReleaseNotification(job.data.to, job.data.repo, job.data.tag, job.data.unsubscribeToken);
      } catch (err) {
        logger.error({ err, jobId: job.id }, 'failed to send release notification');
        throw err;
      }
    }
  };
}
