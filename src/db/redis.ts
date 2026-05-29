import { createClient } from 'redis';
import config from '../config/env.js';
import { logger } from '../di/logger.js';

export const redis = createClient({ url: config.REDIS_URL });

const log = logger.child({ module: 'redis' });
redis.on('error', (err) => log.error({ err }, 'redis connection error'));

export async function connectRedis(): Promise<void> {
  await redis.connect();
  log.info('redis connected successfully');
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  log.info('redis disconnected');
}
