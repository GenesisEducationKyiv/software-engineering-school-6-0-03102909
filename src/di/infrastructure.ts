import { redis } from '../db/redis.js';
import { Resend } from 'resend';
import config from '../config/env.js';
import { ConfirmationEmailQueue } from '../jobs/email.queue.js';
import boss from '../jobs/boss.js';
import { createLogger } from '../config/logger.js';

export { redis };
export const resend = new Resend(config.RESEND_API_KEY);
export const confirmationEmailQueue = new ConfirmationEmailQueue(boss);
export const logger = createLogger();
export { boss };
