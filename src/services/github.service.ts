import axios from 'axios';
import config from '../config/env.js';
import { HttpError } from '../errors/HttpError.js';

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

export async function validateRepository(owner: string, name: string): Promise<GithubRepoData> {
  try {
    const url = `https://api.github.com/repos/${owner}/${name}`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Github-Release-Notifier',
    };

    if (config.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${config.GITHUB_TOKEN}`;
    }

    await axios.get(url, { headers });
    return { owner, name };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 404) {
        throw new GithubApiError(`Repository ${owner}/${name} not found`, 404);
      }

      if (status === 403 || status === 429) {
        throw new GithubApiError('GitHub API rate limit exceeded', 503);
      }
    }

    throw new GithubApiError('Failed to validate repository', 500);
  }
}
