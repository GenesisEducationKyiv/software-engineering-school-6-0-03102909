import { createClient } from 'redis';
import config from '../config/env.js';

export const redis = createClient({ url: config.REDIS_URL });

redis.on('error', (err) => console.error('redis error:', err));

export async function connectRedis(): Promise<void> {
  await redis.connect();
  console.log('redis connected');
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}
