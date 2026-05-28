import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import config from '../config/env.js';
import { AppError } from '../errors/AppError.js';

import type { IGithubClient } from '../interfaces/infrastructure.interfaces.js';

export class GithubApiError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'GithubApiError';
  }
}

export class GithubNotFoundError extends GithubApiError {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'GithubNotFoundError';
  }
}

export class GithubRateLimitError extends GithubApiError {
  constructor(message = 'GitHub API rate limit exceeded') {
    super(message);
    this.name = 'GithubRateLimitError';
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
  private httpClient: AxiosInstance;

  constructor() {
    this.httpClient = axios.create({ baseURL: config.GITHUB_API_URL, headers: buildHeaders() });
  }

  private async githubGet<T>(path: string, fallbackError: string): Promise<AxiosResponse<T>> {
    try {
      return await this.httpClient.get<T>(path);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 404) {
          throw new GithubNotFoundError();
        }

        if (status === 403 || status === 429) {
          throw new GithubRateLimitError();
        }
      }

      throw new GithubApiError(fallbackError);
    }
  }

  async validateRepository(owner: string, name: string): Promise<GithubRepoData> {
    try {
      await this.githubGet(`/repos/${owner}/${name}`, 'Failed to validate repository');
      return { owner, name };
    } catch (error) {
      if (error instanceof GithubNotFoundError) {
        throw new GithubNotFoundError(`Repository ${owner}/${name} not found`);
      }
      throw error;
    }
  }

  async getLatestRelease(owner: string, name: string): Promise<string> {
    const path = `/repos/${owner}/${name}/releases/latest`;
    const response = await this.githubGet<{ tag_name: string }>(
      path,
      'Failed to fetch latest release',
    );
    return response.data.tag_name;
  }
}
