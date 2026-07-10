import type { Logger } from './config/logger.js';
import type { MailerService } from './services/mailer.service.js';
import { connectRabbitMQ, consumeQueue, QUEUE_CONFIG } from './messaging/rabbitmq.js';
import { SagaReplyPublisher } from './messaging/saga-publisher.js';
import { createConfirmationEmailHandler } from './handlers/confirmation-email.handler.js';
import { createReleaseNotificationHandler } from './handlers/release-notification.handler.js';
import { ConfirmationEmailSchema } from '@github-release-notification/shared';
import { ReleaseNotificationSchema } from '@github-release-notification/shared';

export async function startWorker(
  rabbitmqUrl: string,
  prefetch: number,
  mailer: MailerService,
  logger: Logger,
): Promise<void> {
  const channel = await connectRabbitMQ(rabbitmqUrl, prefetch, logger);
  const sagaPublisher = new SagaReplyPublisher(channel);

  const confirmationHandler = createConfirmationEmailHandler(mailer, sagaPublisher, logger);
  const releaseHandler = createReleaseNotificationHandler(mailer, logger);

  await consumeQueue(
    QUEUE_CONFIG.CONFIRMATION_EMAIL.queue,
    ConfirmationEmailSchema,
    confirmationHandler,
    logger,
  );
  await consumeQueue(
    QUEUE_CONFIG.RELEASE_NOTIFICATION.queue,
    ReleaseNotificationSchema,
    releaseHandler,
    logger,
  );

  logger.info('RabbitMQ consumer started');
}
