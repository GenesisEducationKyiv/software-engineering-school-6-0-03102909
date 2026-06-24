import type { ConfirmChannel } from 'amqplib';
import type { ChannelWrapper } from 'amqp-connection-manager';
import type { Logger } from '../logger.js';
import { QUEUE_CONFIG } from './rabbitmq.js';
import { SagaReplySchema, type SagaReply } from '../../modules/subscription/validation/saga-reply.schema.js';

export class SagaReplyConsumer {
  private readonly log: Logger;

  constructor(
    private readonly channel: ChannelWrapper,
    logger: Logger,
  ) {
    this.log = logger.child({ module: 'SagaReplyConsumer' });
  }

  async startListening(handler: (reply: SagaReply) => Promise<void>) {
    await this.channel.addSetup(async (ch: ConfirmChannel) => {
      await ch.consume(QUEUE_CONFIG.SAGA_REPLY.queue, async (msg) => {
        if (!msg) return;
        
        try {
          const rawReply = JSON.parse(msg.content.toString());
          const reply = SagaReplySchema.parse(rawReply);
          
          await handler(reply);

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
