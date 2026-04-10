import axios, { type AxiosResponse } from 'axios';
import config from '../config/env.js';
import { HttpError } from '../errors/HttpError.js';

const GITHUB_API = 'https://api.github.com';

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
  try {
    return await axios.get<T>(`${GITHUB_API}${path}`, { headers: buildHeaders() });
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
  try {
    const response = await githubGet<{ tag_name: string }>(
      `/repos/${owner}/${name}/releases/latest`,
      'Failed to fetch latest release',
    );
    return response.data.tag_name ?? null;
  } catch (error) {
    if (error instanceof GithubApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
