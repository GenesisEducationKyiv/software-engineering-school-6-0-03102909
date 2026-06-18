import amqplib, { type ChannelModel, type Channel, type ConsumeMessage } from 'amqplib';
import type { Logger } from '../config/logger.js';

let connection: ChannelModel | undefined;
let channel: Channel | undefined;

export async function connectRabbitMQ(url: string, logger: Logger): Promise<Channel> {
  connection = await amqplib.connect(url);
  
  connection.on('error', (err) => logger.error({ err }, 'RabbitMQ connection error'));
  connection.on('close', () => {
    logger.error('RabbitMQ connection closed. Exiting process.');
    process.exit(1);
  });

  channel = await connection.createChannel();
  
  channel.on('error', (err) => logger.error({ err }, 'RabbitMQ channel error'));
  channel.on('close', () => logger.warn('RabbitMQ channel closed'));

  await channel.prefetch(10);

  logger.info('RabbitMQ connected');
  return channel;
}

export async function disconnectRabbitMQ(logger: Logger): Promise<void> {
  if (channel) {
    try { await channel.close(); } catch (err) { logger.warn({ err }, 'Error closing channel'); }
  }
  if (connection) {
    try { 
      connection.removeAllListeners('close');
      await connection.close(); 
    } catch (err) { logger.warn({ err }, 'Error closing connection'); }
  }
  logger.info('RabbitMQ disconnected');
}

export async function consumeQueue<T>(
  queueName: string, 
  handler: (data: T) => Promise<void>, 
  logger: Logger
): Promise<void> {
  const currentChannel = channel; 
  if (!currentChannel) throw new Error('Channel not initialized');
  
  await currentChannel.assertQueue(queueName, { durable: true });
  
  await currentChannel.consume(queueName, async (msg: ConsumeMessage | null) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString()) as T;
      await handler(data);
      currentChannel.ack(msg); 
    } catch (err) {
      logger.error({ err, queue: queueName }, 'Failed to process message');
      currentChannel.nack(msg, false, false); 
    }
  });
}
