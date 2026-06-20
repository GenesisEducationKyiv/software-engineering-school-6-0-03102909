import type { Logger } from './config/logger.js';
import type { MailerService } from './services/mailer.service.js';
import { connectRabbitMQ, consumeQueue } from './messaging/rabbitmq.js';
import { createConfirmationEmailHandler } from './handlers/confirmation-email.handler.js';
import { createReleaseNotificationHandler } from './handlers/release-notification.handler.js';
import { ConfirmationEmailSchema } from './dto/confirmation-email.dto.js';
import { ReleaseNotificationSchema } from './dto/release-notification.dto.js';

export async function startWorker(rabbitmqUrl: string, mailer: MailerService, logger: Logger): Promise<void> {
  await connectRabbitMQ(rabbitmqUrl, logger);

  const confirmationHandler = createConfirmationEmailHandler(mailer, logger);
  const releaseHandler = createReleaseNotificationHandler(mailer, logger);

  await consumeQueue('send-confirmation-email', ConfirmationEmailSchema, confirmationHandler, logger);
  await consumeQueue('send-release-notification', ReleaseNotificationSchema, releaseHandler, logger);

  logger.info('RabbitMQ consumer started');
}
