import { z } from 'zod';
import type { ConfirmChannel } from 'amqplib';
import type { ChannelWrapper } from 'amqp-connection-manager';
import type { Logger } from '../../../shared/logger.js';
import type { ISubscriptionRepository } from '../interfaces.js';
import { QUEUE_CONFIG } from '../../../shared/messaging/rabbitmq.js';

export const SagaReplySchema = z.object({
  type: z.enum(['ConfirmationEmailSent', 'ConfirmationEmailFailed']),
  payload: z.object({
    confirmToken: z.string(),
    error: z.string().optional(),
  }),
});

export type SagaReply = z.infer<typeof SagaReplySchema>;

export class SubscriptionSaga {
  private readonly log: Logger;

  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly channel: ChannelWrapper,
    logger: Logger,
  ) {
    this.log = logger.child({ service: 'SubscriptionSaga' });
  }

  async startListening() {
    await this.channel.addSetup(async (ch: ConfirmChannel) => {
      await ch.consume(QUEUE_CONFIG.SAGA_REPLY.queue, async (msg) => {
        if (!msg) return;
        
        try {
          const rawReply = JSON.parse(msg.content.toString());
          const reply = SagaReplySchema.parse(rawReply);
          
          this.log.debug({ type: reply.type }, 'received saga reply');

          if (reply.type === 'ConfirmationEmailSent') {
            this.log.info({ confirmToken: reply.payload.confirmToken }, 'confirmation email sent successfully');
          }

          if (reply.type === 'ConfirmationEmailFailed') {
            this.log.info({ confirmToken: reply.payload.confirmToken, error: reply.payload.error }, 'email failed, running compensation');
            await this.subscriptionRepo.removeByConfirmToken(reply.payload.confirmToken);
          }

          ch.ack(msg);
        } catch (err) {
          this.log.error({ err }, 'failed to process saga reply');
          ch.nack(msg, false, false);
        }
      });
    });
    this.log.info('Subscription saga listener started');
  }
}
