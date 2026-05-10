import type { ICacheProvider } from '../interfaces/infrastructure.interfaces.js';
import { redis } from './redis.js';

export class RedisCacheProvider implements ICacheProvider {
  async get(key: string): Promise<string | null> {
    return await redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await redis.set(key, value, { EX: ttlSeconds });
  }
}
