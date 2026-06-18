import { redis } from '../db/redis.js';
import { NotificationQueue } from '../shared/queue.js';
import { logger } from './logger.js';
import type { Channel } from 'amqplib';

export { redis };
export { logger };

export function createNotificationQueue(channel: Channel): NotificationQueue {
  return new NotificationQueue(channel);
}
