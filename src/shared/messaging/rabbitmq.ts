import amqplib, { type ChannelModel, type Channel } from 'amqplib';
import type { Logger } from '../logger.js';

const EXCHANGE_NAME = 'notifications';

const QUEUE_CONFIG = {
  CONFIRMATION_EMAIL: { queue: 'send-confirmation-email', routingKey: 'confirmation-email' },
  RELEASE_NOTIFICATION: { queue: 'send-release-notification', routingKey: 'release-notification' },
} as const;

let connection: ChannelModel | undefined;
let channel: Channel | undefined;

export async function connectRabbitMQ(url: string, logger: Logger): Promise<Channel> {
  const log = logger.child({ module: 'rabbitmq' });

  connection = await amqplib.connect(url);

  connection.on('error', (err) => log.error({ err }, 'RabbitMQ connection error'));
  connection.on('close', () => log.warn('RabbitMQ connection closed'));

  channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });

  for (const { queue, routingKey } of Object.values(QUEUE_CONFIG)) {
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, EXCHANGE_NAME, routingKey);
  }

  log.info('RabbitMQ connected, exchange and queues asserted');
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
  
  log.info('RabbitMQ disconnected');
}

export { EXCHANGE_NAME, QUEUE_CONFIG };