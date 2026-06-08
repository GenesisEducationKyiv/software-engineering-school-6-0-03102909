import { redis } from '../db/redis.js';
import { ConfirmationEmailQueue } from '../shared/mailer/index.js';
import boss from '../db/boss.js';
import { logger } from './logger.js';

export { redis };
export const confirmationEmailQueue = new ConfirmationEmailQueue(boss);
export { logger };
export { boss };
