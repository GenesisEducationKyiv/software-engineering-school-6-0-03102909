import amqp, { type AmqpConnectionManager, type ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import type { Logger } from '../logger.js';
import { toError } from '../errors.js';

const EXCHANGE_NAME = 'notifications';
export const DLX_EXCHANGE = 'notifications.dlx';
export const DLQ_NAME = 'dead-letters';

const QUEUE_CONFIG = {
  CONFIRMATION_EMAIL: { queue: 'send-confirmation-email', routingKey: 'confirmation-email' },
  RELEASE_NOTIFICATION: { queue: 'send-release-notification', routingKey: 'release-notification' },
  SAGA_REPLY: { queue: 'saga-reply', routingKey: 'saga-reply' },
} as const;

let connection: AmqpConnectionManager | undefined;
let channel: ChannelWrapper | undefined;

export async function connectRabbitMQ(
  url: string,
  logger: Logger,
  prefetch?: number,
): Promise<ChannelWrapper> {
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
          deadLetterExchange: DLX_EXCHANGE,
        });
        await ch.bindQueue(queue, EXCHANGE_NAME, routingKey);
      }
      if (prefetch !== undefined) {
        await ch.prefetch(prefetch);
      }
      log.info('RabbitMQ exchange and queues asserted');
    },
  });

  await channel.waitForConnect();

  return channel;
}

export async function disconnectRabbitMQ(logger: Logger): Promise<void> {
  const log = logger.child({ module: 'rabbitmq' });

  if (channel) {
    try {
      await channel.close();
    } catch (err) {
      log.warn({ err }, 'Error closing channel');
    }
  }

  if (connection) {
    try {
      await connection.close();
    } catch (err) {
      log.warn({ err }, 'Error closing connection');
    }
  }

  log.info('RabbitMQ manually disconnected');
}

export { EXCHANGE_NAME, QUEUE_CONFIG };

export function safeAck(ch: ConfirmChannel, msg: ConsumeMessage, logger: Logger) {
  try {
    ch.ack(msg);
  } catch (err) {
    if (toError(err).message !== 'Channel closed') {
      logger.warn({ err }, 'Failed to acknowledge message');
    }
  }
}

export function safeNack(ch: ConfirmChannel, msg: ConsumeMessage, logger: Logger) {
  try {
    ch.nack(msg, false, false);
  } catch (err) {
    if (toError(err).message !== 'Channel closed') {
      logger.warn({ err }, 'Failed to negative-acknowledge message');
    }
  }
}
