import type { Logger } from '../config/logger.js';
import type { MailerService } from '../services/mailer.service.js';
import type { ConfirmationEmailDto } from '@github-release-notification/shared';
import type { ISagaReplyPublisher } from '../messaging/saga-publisher.js';

export function createConfirmationEmailHandler(
  mailer: MailerService,
  sagaPublisher: ISagaReplyPublisher,
  logger: Logger,
) {
  return async (data: ConfirmationEmailDto) => {
    logger.info({ to: data.to }, 'processing confirmation email');
    try {
      await mailer.sendConfirmationEmail(data.to, data.repo, data.confirmToken);
    } catch (err) {
      logger.error({ err, to: data.to }, 'failed to send confirmation email');
      await sagaPublisher.publishFailure(data.confirmToken, (err as Error).message);
      logger.info({ to: data.to }, 'saga failure reply published');
      return;
    }

    await sagaPublisher.publishSuccess(data.confirmToken);
    logger.info({ to: data.to }, 'confirmation email sent, saga reply published');
  };
}
