import type { Logger } from '../config/logger.js';
import type { MailerService } from '../services/mailer.service.js';
import type { ConfirmationEmailDto } from '../dto/confirmation-email.dto.js';

export function createConfirmationEmailHandler(mailer: MailerService, logger: Logger) {
  return async (data: ConfirmationEmailDto) => {
    logger.info({ to: data.to }, 'processing confirmation email');
    try {
      await mailer.sendConfirmationEmail(data.to, data.repo, data.confirmToken);
    } catch (err) {
      logger.error({ err, to: data.to }, 'failed to send confirmation email');
      throw err;
    }
  };
}
