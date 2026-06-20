import amqp, { type AmqpConnectionManager, type ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel } from 'amqplib';
import type { Logger } from '../logger.js';

const EXCHANGE_NAME = 'notifications';

const QUEUE_CONFIG = {
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
      log.info('RabbitMQ exchange and queues asserted');
    },
  });

  await channel.waitForConnect();
  
  return channel;
}

export async function disconnectRabbitMQ(logger: Logger): Promise<void> {
  const log = logger.child({ module: 'rabbitmq' });
  
  if (channel) {
    try { await channel.close(); } 
    catch (err) { log.warn({ err }, 'Error closing channel'); }
  }
  
  if (connection) {
    try { await connection.close(); } 
    catch (err) { log.warn({ err }, 'Error closing connection'); }
  }
  
  log.info('RabbitMQ manually disconnected');
}

export { EXCHANGE_NAME, QUEUE_CONFIG };