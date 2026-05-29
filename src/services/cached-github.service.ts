import type { IGithubClient } from '../interfaces/infrastructure.interfaces.js';
import type { ILogger } from '../config/logger.js';
import type { GithubRepoData } from './github.service.js';
import type { redis } from '../db/redis.js';
import config from '../config/env.js';

export class CachedGithubClient implements IGithubClient {
  private readonly log: ILogger;

  constructor(
    private readonly cache: typeof redis,
    private readonly githubClient: IGithubClient,
    logger: ILogger
  ) {
    this.log = logger.child({ service: 'CachedGithubClient' });
  }

  async validateRepository(owner: string, name: string): Promise<GithubRepoData> {
    const cacheKey = `github:repo:${owner}:${name}`;
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.log.debug({ cacheKey }, 'cache hit for repository validation');
        return JSON.parse(cached);
      }
    } catch (error) {
      this.log.warn({ err: error, cacheKey }, 'redis failed to read cache during repository validation');
    }

    const result = await this.githubClient.validateRepository(owner, name);

    await this.cache
      .set(cacheKey, JSON.stringify(result), { EX: config.GITHUB_CACHE_TTL })
      .catch((err) => this.log.warn({ err, cacheKey }, 'failed to write repository validation to cache'));

    return result;
  }

  async getLatestRelease(owner: string, name: string): Promise<string> {
    const cacheKey = `github:release:${owner}:${name}`;
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.log.debug({ cacheKey }, 'cache hit for latest release');
        return cached;
      }
    } catch (error) {
      this.log.warn({ err: error, cacheKey }, 'redis failed to read cache during getting latest release');
    }

    const result = await this.githubClient.getLatestRelease(owner, name);

    await this.cache
      .set(cacheKey, result, { EX: config.GITHUB_CACHE_TTL })
      .catch((err) => this.log.warn({ err, cacheKey }, 'failed to write latest release to cache'));

    return result;
  }
}
