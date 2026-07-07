import type { Logger } from '@github-release-notification/shared';
import type { ISubscriptionRepository } from '../interfaces.js';
import type { SagaReply } from '@github-release-notification/shared';

export function createSubscriptionSagaHandler(
  subscriptionRepo: ISubscriptionRepository,
  logger: Logger,
) {
  const log = logger.child({ service: 'SubscriptionSaga' });

  return async (reply: SagaReply): Promise<void> => {
    log.debug({ type: reply.type }, 'processing saga reply');

    if (reply.type === 'ConfirmationEmailSent') {
      log.info(
        { confirmToken: reply.payload.confirmToken },
        'confirmation email sent successfully',
      );
    }

    if (reply.type === 'ConfirmationEmailFailed') {
      log.info(
        { confirmToken: reply.payload.confirmToken, error: reply.payload.error },
        'email failed, running compensation',
      );
      await subscriptionRepo.removePendingByConfirmToken(reply.payload.confirmToken);
    }
  };
}
