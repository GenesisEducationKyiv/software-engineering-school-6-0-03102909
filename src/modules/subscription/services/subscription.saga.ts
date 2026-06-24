import type { Logger } from '../../../shared/logger.js';
import type { ISubscriptionRepository } from '../interfaces.js';
import type { SagaReply } from '../validation/saga-reply.schema.js';

export function createSubscriptionSagaHandler(
  subscriptionRepo: ISubscriptionRepository,
  logger: Logger,
) {
  const log = logger.child({ service: 'SubscriptionSaga' });

  return async (reply: SagaReply): Promise<void> => {
    log.debug({ type: reply.type }, 'processing saga reply');

    if (reply.type === 'ConfirmationEmailSent') {
      log.info({ confirmToken: reply.payload.confirmToken }, 'confirmation email sent successfully');
    }

    if (reply.type === 'ConfirmationEmailFailed') {
      log.info({ confirmToken: reply.payload.confirmToken, error: reply.payload.error }, 'email failed, running compensation');
      await subscriptionRepo.removeByConfirmToken(reply.payload.confirmToken);
    }
  };
}
