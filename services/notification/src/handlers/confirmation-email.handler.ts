import type { Job } from 'pg-boss';
import type { Logger } from '../config/logger.js';
import type { MailerService } from '../services/mailer.service.js';
import type { ConfirmationEmailDto } from '../dto/confirmation-email.dto.js';

export function createConfirmationEmailHandler(mailer: MailerService, logger: Logger) {
  return async (jobs: Job<ConfirmationEmailDto>[]) => {
    for (const job of jobs) {
      logger.info({ jobId: job.id, to: job.data.to }, 'processing confirmation email');
      try {
        await mailer.sendConfirmationEmail(job.data.to, job.data.repo, job.data.confirmToken);
      } catch (err) {
        logger.error({ err, jobId: job.id }, 'failed to send confirmation email');
        throw err;
      }
    }
  };
}
