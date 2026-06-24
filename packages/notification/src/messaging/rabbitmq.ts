import amqp, { type AmqpConnectionManager, type ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import type { Logger } from '../config/logger.js';
import type { z } from 'zod';

export const EXCHANGE_NAME = 'notifications';
export const DLX_EXCHANGE = 'notifications.dlx';
export const DLQ_NAME = 'dead-letters';

export const QUEUE_CONFIG = {
  CONFIRMATION_EMAIL: { queue: 'send-confirmation-email', routingKey: 'confirmation-email' },
  RELEASE_NOTIFICATION: { queue: 'send-release-notification', routingKey: 'release-notification' },
  SAGA_REPLY: { queue: 'saga-reply', routingKey: 'saga-reply' },
} as const;

let connection: AmqpConnectionManager | undefined;
let channel: ChannelWrapper | undefined;

export async function connectRabbitMQ(url: string, prefetch: number, logger: Logger): Promise<ChannelWrapper> {
  const log = logger.child({ module: 'rabbitmq' });

  connection = amqp.connect([url]);
  
  connection.on('connect', () => log.info('RabbitMQ connected'));
  connection.on('disconnect', (err) => log.warn({ err }, 'RabbitMQ disconnected. Retrying...'));

  channel = connection.createChannel({
    json: true,
    setup: async (ch: ConfirmChannel) => {
      await ch.assertExchange(DLX_EXCHANGE, 'fanout', { durable: true });
      await ch.assertQueue(DLQ_NAME, { durable: true });
      await ch.bindQueue(DLQ_NAME, DLX_EXCHANGE, '');

      await ch.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });
      for (const { queue, routingKey } of Object.values(QUEUE_CONFIG)) {
        await ch.assertQueue(queue, { 
          durable: true,
          deadLetterExchange: DLX_EXCHANGE
        });
        await ch.bindQueue(queue, EXCHANGE_NAME, routingKey);
      }
      await ch.prefetch(prefetch);
      log.info('RabbitMQ exchange and queues asserted');
    }
  });

  await channel.waitForConnect();
  return channel;
}

export async function disconnectRabbitMQ(logger: Logger): Promise<void> {
  const log = logger.child({ module: 'rabbitmq' });

  if (channel) {
    try { await channel.close(); } catch (err) { log.warn({ err }, 'Error closing channel'); }
    channel = undefined;
  }
  if (connection) {
    try { await connection.close(); } catch (err) { log.warn({ err }, 'Error closing connection'); }
    connection = undefined;
  }
  log.info('RabbitMQ manually disconnected');
}

async function processMessageWithRetry<T>(
  data: T, 
  handler: (data: T) => Promise<void>, 
  queueName: string, 
  logger: Logger
): Promise<boolean> {
  let attempts = 0;
  const maxAttempts = 3;
  while (attempts < maxAttempts) {
    attempts++;
    try {
      await handler(data);
      return true;
    } catch (err) {
      if (attempts >= maxAttempts) {
        logger.error({ err, queue: queueName }, 'Handler failed after retries');
      } else {
        logger.warn({ err, queue: queueName, attempt: attempts }, 'Handler failed, retrying...');
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  return false;
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
  logger: Logger
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
        success = await processMessageWithRetry(parsedData, handler, queueName, logger);
      }

      if (success) {
        safeAck(ch, msg, logger);
      } else {
        safeNack(ch, msg, logger);
      }
    });
  });
}
