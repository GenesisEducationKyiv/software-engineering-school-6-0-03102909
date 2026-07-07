import type { ConfirmChannel } from 'amqplib';
import type { ChannelWrapper } from 'amqp-connection-manager';
import {
  type Logger,
  QUEUE_CONFIG,
  SagaReplySchema,
  type SagaReply,
  processWithRetry,
  type RetryPolicy,
  DEFAULT_RETRY_POLICY,
} from '@github-release-notification/shared';

export class SagaReplyConsumer {
  private readonly log: Logger;

  constructor(
    private readonly channel: ChannelWrapper,
    logger: Logger,
  ) {
    this.log = logger.child({ module: 'SagaReplyConsumer' });
  }

  async startListening(
    handler: (reply: SagaReply) => Promise<void>,
    retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY,
  ) {
    await this.channel.addSetup(async (ch: ConfirmChannel) => {
      await ch.consume(QUEUE_CONFIG.SAGA_REPLY.queue, async (msg) => {
        if (!msg) return;

        let reply: SagaReply;
        try {
          const rawReply = JSON.parse(msg.content.toString());
          reply = SagaReplySchema.parse(rawReply);
        } catch (err) {
          this.log.error({ err }, 'failed to parse/validate saga reply');
          ch.nack(msg, false, false);
          return;
        }

        const success = await processWithRetry(
          reply,
          handler,
          this.log,
          'saga_reply_handler',
          retryPolicy,
        );

        if (success) {
          ch.ack(msg);
        } else {
          ch.nack(msg, false, false);
        }
      });
    });
    this.log.info('Subscription saga listener started');
  }
}
