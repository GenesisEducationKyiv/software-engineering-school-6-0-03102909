import { redis } from '../db/redis.js';
import { NotificationQueue } from '../shared/queue.js';
import { logger } from './logger.js';
import type { ChannelWrapper } from 'amqp-connection-manager';

export { redis };
export { logger };

export function createNotificationQueue(channel: ChannelWrapper): NotificationQueue {
  return new NotificationQueue(channel);
}
