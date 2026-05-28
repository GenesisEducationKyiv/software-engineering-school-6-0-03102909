import { redis } from '../db/redis.js';
import { Resend } from 'resend';
import config from '../config/env.js';
import { EmailJobQueue } from '../jobs/email.queue.js';
import boss from '../jobs/boss.js';

export { redis };
export const resend = new Resend(config.RESEND_API_KEY);
export const emailJobQueue = new EmailJobQueue(boss);
export { boss };
