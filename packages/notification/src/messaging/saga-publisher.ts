import type { ChannelWrapper } from 'amqp-connection-manager';
import { EXCHANGE_NAME, QUEUE_CONFIG } from './rabbitmq.js';
import { createSuccessReply, createFailureReply } from '@github-release-notification/shared';
import { toError } from '../errors.js';

export interface ISagaReplyPublisher {
  publishSuccess(confirmToken: string): Promise<void>;
  publishFailure(confirmToken: string, error: unknown): Promise<void>;
}

export class SagaReplyPublisher implements ISagaReplyPublisher {
  constructor(private readonly channel: ChannelWrapper) {}

  async publishSuccess(confirmToken: string): Promise<void> {
    await this.channel.publish(
      EXCHANGE_NAME,
      QUEUE_CONFIG.SAGA_REPLY.routingKey,
      createSuccessReply(confirmToken),
      { persistent: true },
    );
  }

  async publishFailure(confirmToken: string, error: unknown): Promise<void> {
    const message = toError(error).message;
    await this.channel.publish(
      EXCHANGE_NAME,
      QUEUE_CONFIG.SAGA_REPLY.routingKey,
      createFailureReply(confirmToken, message),
      { persistent: true },
    );
  }
}
