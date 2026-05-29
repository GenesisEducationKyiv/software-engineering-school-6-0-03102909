import type { IGithubClient } from '../interfaces/infrastructure.interfaces.js';
import type { GithubRepoData } from './github.service.js';
import type { redis } from '../db/redis.js';
import config from '../config/env.js';

export class CachedGithubClient implements IGithubClient {
  constructor(
    private readonly cache: typeof redis,
    private readonly githubClient: IGithubClient,
  ) {}

  async validateRepository(owner: string, name: string): Promise<GithubRepoData> {
    const cacheKey = `github:repo:${owner}:${name}`;
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        console.log(`cache hit ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn(`redis failed to read cache for ${cacheKey}:`, error);
    }

    const result = await this.githubClient.validateRepository(owner, name);

    await this.cache
      .set(cacheKey, JSON.stringify(result), { EX: config.GITHUB_CACHE_TTL })
      .catch(() => {});

    return result;
  }

  async getLatestRelease(owner: string, name: string): Promise<string> {
    const cacheKey = `github:release:${owner}:${name}`;
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        console.log(`cache hit ${cacheKey}`);
        return cached;
      }
    } catch (error) {
      console.warn(`redis failed to read cache for ${cacheKey}:`, error);
    }

    const result = await this.githubClient.getLatestRelease(owner, name);

    await this.cache.set(cacheKey, result, { EX: config.GITHUB_CACHE_TTL }).catch(() => {});

    return result;
  }
}
