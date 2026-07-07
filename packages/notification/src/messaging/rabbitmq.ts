import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import type { Logger } from '@github-release-notification/shared';
import type { z } from 'zod';
import {
  EXCHANGE_NAME,
  QUEUE_CONFIG,
  DLX_EXCHANGE,
  DLQ_NAME,
  connectRabbitMQ as connectSharedRabbitMQ,
  disconnectRabbitMQ as disconnectSharedRabbitMQ,
  processWithRetry,
  type RetryPolicy,
  DEFAULT_RETRY_POLICY,
} from '@github-release-notification/shared';
import type { ChannelWrapper } from 'amqp-connection-manager';

let channel: ChannelWrapper | undefined;

export { EXCHANGE_NAME, QUEUE_CONFIG, DLX_EXCHANGE, DLQ_NAME };

export async function connectRabbitMQ(
  url: string,
  prefetch: number,
  logger: Logger,
): Promise<import('amqp-connection-manager').ChannelWrapper> {
  channel = await connectSharedRabbitMQ(url, logger, prefetch);
  return channel;
}

export async function disconnectRabbitMQ(logger: Logger) {
  await disconnectSharedRabbitMQ(logger);
  channel = undefined;
}



function safeAck(ch: ConfirmChannel, msg: ConsumeMessage, logger: Logger) {
  try {
    ch.ack(msg);
  } catch (err) {
    if ((err as Error).message !== 'Channel closed') {
      logger.warn({ err }, 'Failed to acknowledge message');
    }
  }
}

function safeNack(ch: ConfirmChannel, msg: ConsumeMessage, logger: Logger) {
  try {
    ch.nack(msg, false, false);
  } catch (err) {
    if ((err as Error).message !== 'Channel closed') {
      logger.warn({ err }, 'Failed to negative-acknowledge message');
    }
  }
}

export async function consumeQueue<T>(
  queueName: string,
  schema: z.ZodType<T>,
  handler: (data: T) => Promise<void>,
  logger: Logger,
  retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY,
): Promise<void> {
  const currentChannel = channel;
  if (!currentChannel) throw new Error('Channel not initialized');

  await currentChannel.addSetup(async (ch: ConfirmChannel) => {
    await ch.consume(queueName, async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      let parsedData: T | undefined;
      try {
        const raw = JSON.parse(msg.content.toString());
        parsedData = schema.parse(raw);
      } catch (err) {
        logger.error({ err, queue: queueName }, 'Message parsing or validation failed');
      }

      let success = false;
      if (parsedData !== undefined) {
        success = await processWithRetry(parsedData, handler, logger, queueName, retryPolicy);
      }

      if (success) {
        safeAck(ch, msg, logger);
      } else {
        safeNack(ch, msg, logger);
      }
    });
  });
}
