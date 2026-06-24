import type { ChannelWrapper } from 'amqp-connection-manager';
import type { Logger } from '../config/logger.js';
import type { MailerService } from '../services/mailer.service.js';
import type { ConfirmationEmailDto } from '../dto/confirmation-email.dto.js';
import { EXCHANGE_NAME, QUEUE_CONFIG } from '../messaging/rabbitmq.js';

export function createConfirmationEmailHandler(mailer: MailerService, channel: ChannelWrapper, logger: Logger) {
  return async (data: ConfirmationEmailDto) => {
    logger.info({ to: data.to }, 'processing confirmation email');
    try {
      await mailer.sendConfirmationEmail(data.to, data.repo, data.confirmToken);

      await channel.publish(EXCHANGE_NAME, QUEUE_CONFIG.SAGA_REPLY.routingKey, {
        type: 'ConfirmationEmailSent',
        payload: { confirmToken: data.confirmToken },
      }, { persistent: true });

      logger.info({ to: data.to }, 'confirmation email sent, saga reply published');
    } catch (err) {
      logger.error({ err, to: data.to }, 'failed to send confirmation email');

      await channel.publish(EXCHANGE_NAME, QUEUE_CONFIG.SAGA_REPLY.routingKey, {
        type: 'ConfirmationEmailFailed',
        payload: { confirmToken: data.confirmToken, error: (err as Error).message },
      }, { persistent: true });

      logger.info({ to: data.to }, 'saga failure reply published');
    }
  };
}
