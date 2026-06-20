import amqp, { type AmqpConnectionManager, type ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import type { Logger } from '../config/logger.js';
import type { z } from 'zod';

export const EXCHANGE_NAME = 'notifications';

export const QUEUE_CONFIG = {
  CONFIRMATION_EMAIL: { queue: 'send-confirmation-email', routingKey: 'confirmation-email' },
  RELEASE_NOTIFICATION: { queue: 'send-release-notification', routingKey: 'release-notification' },
} as const;

let connection: AmqpConnectionManager | undefined;
let channel: ChannelWrapper | undefined;

export async function connectRabbitMQ(url: string, logger: Logger): Promise<ChannelWrapper> {
  const log = logger.child({ module: 'rabbitmq' });

  connection = amqp.connect([url]);
  
  connection.on('connect', () => log.info('RabbitMQ connected'));
  connection.on('disconnect', (err) => log.warn({ err }, 'RabbitMQ disconnected. Retrying...'));

  channel = connection.createChannel({
    json: true,
    setup: async (ch: ConfirmChannel) => {
      await ch.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });
      for (const { queue, routingKey } of Object.values(QUEUE_CONFIG)) {
        await ch.assertQueue(queue, { durable: true });
        await ch.bindQueue(queue, EXCHANGE_NAME, routingKey);
      }
      await ch.prefetch(10);
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
  }
  if (connection) {
    try { await connection.close(); } catch (err) { log.warn({ err }, 'Error closing connection'); }
  }
  log.info('RabbitMQ manually disconnected');
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
      try {
        const raw = JSON.parse(msg.content.toString());
        const data = schema.parse(raw);
        await handler(data);
        ch.ack(msg); 
      } catch (err) {
        logger.error({ err, queue: queueName }, 'Failed to process message or validation failed');
        ch.nack(msg, false, false); 
      }
    });
  });
}
