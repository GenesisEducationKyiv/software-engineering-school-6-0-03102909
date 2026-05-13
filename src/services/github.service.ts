import axios, { type AxiosResponse } from 'axios';
import config from '../config/env.js';
import { HttpError } from '../errors/HttpError.js';
import type { ICacheProvider, IGithubClient } from '../interfaces/infrastructure.interfaces.js';

const GITHUB_API = 'https://api.github.com';
const CACHE_TTL = 600;

export class GithubApiError extends HttpError {
  constructor(message: string, status: number) {
    super(message, status);
    this.name = 'GithubApiError';
  }
}

export interface GithubRepoData {
  owner: string;
  name: string;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Github-Release-Notifier',
  };

  if (config.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${config.GITHUB_TOKEN}`;
  }

  return headers;
}

export class GithubService implements IGithubClient {
  constructor(private readonly cache: ICacheProvider) {}

  private async githubGet<T>(path: string, fallbackError: string): Promise<AxiosResponse<T>> {
    const cacheKey = `github:${path}`;

    try {
      const cached = await this.cache.get(cacheKey);
      if (cached !== null) {
        console.log(`cache hit ${path}`);
        return { data: JSON.parse(cached) } as AxiosResponse<T>;
      }
    } catch (error) {
      console.warn(`redis failed to read cache for ${cacheKey}:`, error);
    }

    try {
      const response = await axios.get<T>(`${GITHUB_API}${path}`, { headers: buildHeaders() });

      await this.cache.set(cacheKey, JSON.stringify(response.data), CACHE_TTL).catch(() => {});

      return response;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 404) {
          throw new GithubApiError('Not found', 404);
        }

        if (status === 403 || status === 429) {
          throw new GithubApiError('GitHub API rate limit exceeded', 503);
        }
      }

      throw new GithubApiError(fallbackError, 500);
    }
  }

  async validateRepository(owner: string, name: string): Promise<GithubRepoData> {
    try {
      await this.githubGet(`/repos/${owner}/${name}`, 'Failed to validate repository');
      return { owner, name };
    } catch (error) {
      if (error instanceof GithubApiError && error.status === 404) {
        throw new GithubApiError(`Repository ${owner}/${name} not found`, 404);
      }
      throw error;
    }
  }

  async getLatestRelease(owner: string, name: string): Promise<string> {
    const path = `/repos/${owner}/${name}/releases/latest`;
    const response = await this.githubGet<{ tag_name: string }>(path, 'Failed to fetch latest release');
    return response.data.tag_name;
  }
}
