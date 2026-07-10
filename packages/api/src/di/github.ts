import { GithubService, CachedGithubClient } from '../shared/github/index.js';
import { redis, logger } from './infrastructure.js';

export const rawGithubClient = new GithubService();
export const githubClient = new CachedGithubClient(redis, rawGithubClient, logger);
