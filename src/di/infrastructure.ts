import { redis } from '../db/redis.js';
import { Resend } from 'resend';
import config from '../config/env.js';
import { ConfirmationEmailQueue } from '../modules/notification/jobs/email.queue.js';
import boss from '../db/boss.js';
import { logger } from './logger.js';

export { redis };
export const resend = new Resend(config.RESEND_API_KEY);
export const confirmationEmailQueue = new ConfirmationEmailQueue(boss);
export { logger };
export { boss };
