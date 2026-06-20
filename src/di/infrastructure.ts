import { redis } from '../db/redis.js';
import { NotificationQueue } from '../shared/queue.js';
import boss from '../db/boss.js';
import { logger } from './logger.js';

export { redis };
export const notificationQueue = new NotificationQueue(boss);
export { logger };
export { boss };
