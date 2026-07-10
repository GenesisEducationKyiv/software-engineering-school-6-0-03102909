import type { Logger } from '../config/logger.js';
import type { MailerService } from '../services/mailer.service.js';
import type { ReleaseNotificationDto } from '../dto/release-notification.dto.js';

export function createReleaseNotificationHandler(mailer: MailerService, logger: Logger) {
  return async (data: ReleaseNotificationDto) => {
    logger.info({ to: data.to, repo: data.repo, tag: data.tag }, 'processing release notification');
    try {
      await mailer.sendReleaseNotification(data.to, data.repo, data.tag, data.unsubscribeToken);
    } catch (err) {
      logger.error({ err, to: data.to }, 'failed to send release notification');
      throw err;
    }
  };
}
