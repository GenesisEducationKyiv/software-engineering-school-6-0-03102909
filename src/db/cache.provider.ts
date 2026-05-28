import type { ICacheProvider } from '../interfaces/infrastructure.interfaces.js';
import type { redis } from './redis.js';

export class RedisCacheProvider implements ICacheProvider {
  constructor(private readonly redisClient: typeof redis) {}

  async get(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redisClient.set(key, value, { EX: ttlSeconds });
  }
}
