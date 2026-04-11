import axios, { type AxiosResponse } from 'axios';
import config from '../config/env.js';
import { redis } from '../db/redis.js';
import { HttpError } from '../errors/HttpError.js';

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

async function githubGet<T>(path: string, fallbackError: string): Promise<AxiosResponse<T>> {
  const cacheKey = `github:${path}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`cache hit ${path}`);
      return { data: JSON.parse(cached) } as AxiosResponse<T>;
    }
  } catch (error) {
    console.warn(`redis failed to read cache for ${cacheKey}:`, error);
  }

  try {
    const response = await axios.get<T>(`${GITHUB_API}${path}`, { headers: buildHeaders() });

    await redis.set(cacheKey, JSON.stringify(response.data), { EX: CACHE_TTL }).catch(() => {});

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

export async function validateRepository(owner: string, name: string): Promise<GithubRepoData> {
  try {
    await githubGet(`/repos/${owner}/${name}`, 'Failed to validate repository');
    return { owner, name };
  } catch (error) {
    if (error instanceof GithubApiError && error.status === 404) {
      throw new GithubApiError(`Repository ${owner}/${name} not found`, 404);
    }
    throw error;
  }
}

export async function getLatestRelease(owner: string, name: string): Promise<string | null> {
  const path = `/repos/${owner}/${name}/releases/latest`;

  try {
    const response = await githubGet<{ tag_name: string }>(path, 'Failed to fetch latest release');
    return response.data.tag_name ?? null;
  } catch (error) {
    if (error instanceof GithubApiError && error.status === 404) {
      await redis.set(`github:${path}`, JSON.stringify(null), { EX: CACHE_TTL }).catch(() => {});
      return null;
    }
    throw error;
  }
}
