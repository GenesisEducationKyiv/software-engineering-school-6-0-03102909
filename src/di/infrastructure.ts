import { RedisCacheProvider } from '../db/cache.provider.js';
import { redis } from '../db/redis.js';
import { ResendMailTransport } from '../db/mail.transport.js';
import { Resend } from 'resend';
import config from '../config/env.js';
import { EmailJobQueue } from '../jobs/email.queue.js';
import boss from '../jobs/boss.js';

export const cacheProvider = new RedisCacheProvider(redis);
export const resend = new Resend(config.RESEND_API_KEY);
export const mailTransport = new ResendMailTransport(resend);
export const emailJobQueue = new EmailJobQueue(boss);
export { boss };
