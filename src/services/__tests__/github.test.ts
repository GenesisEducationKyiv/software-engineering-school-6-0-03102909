import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');

vi.mock('../../db/redis.js', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../../config/env.js', () => ({
  default: { GITHUB_TOKEN: 'fake-github-token' },
}));

import { redis } from '../../db/redis.js';
import { validateRepository, getLatestRelease, GithubApiError } from '../github.service.js';

describe('GithubService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (axios.isAxiosError as any).mockImplementation((err: any) => err?.isAxiosError === true);
  });

  describe('validateRepository()', () => {
    it('should return owner and name if repository exists (Cache Miss)', async () => {
      (redis.get as any).mockResolvedValue(null);
      (axios.get as any).mockResolvedValue({ data: { id: 12345, full_name: 'owner/repo' } });

      (redis.set as any).mockResolvedValue('OK');

      const result = await validateRepository('owner', 'repo');

      expect(result).toEqual({ owner: 'owner', name: 'repo' });

      expect(axios.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer fake-github-token',
          }),
        }),
      );

      expect(redis.set).toHaveBeenCalledTimes(1);
    });

    it('should throw GithubApiError(404) if repository is not found', async () => {
      (redis.get as any).mockResolvedValue(null);

      const notFoundError = {
        isAxiosError: true,
        response: { status: 404 },
      };
      (axios.get as any).mockRejectedValue(notFoundError);

      await expect(validateRepository('bad-owner', 'bad-repo')).rejects.toThrow(GithubApiError);
      await expect(validateRepository('bad-owner', 'bad-repo')).rejects.toThrow(
        'Repository bad-owner/bad-repo not found',
      );
    });

    it('should throw GithubApiError(503) on Rate Limit (403 or 429)', async () => {
      (redis.get as any).mockResolvedValue(null);
      const rateLimitError = { isAxiosError: true, response: { status: 403 } };
      (axios.get as any).mockRejectedValue(rateLimitError);

      await expect(validateRepository('owner', 'repo')).rejects.toThrow(
        'GitHub API rate limit exceeded',
      );
    });
  });

  describe('getLatestRelease()', () => {
    it('should return the latest tag name from GitHub API (Cache Miss)', async () => {
      (redis.get as any).mockResolvedValue(null);
      (axios.get as any).mockResolvedValue({ data: { tag_name: 'v2.0.0' } });
      (redis.set as any).mockResolvedValue('OK');

      const result = await getLatestRelease('owner', 'repo');

      expect(result).toBe('v2.0.0');
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(redis.set).toHaveBeenCalledTimes(1);
    });

    it('should return the latest tag name from Redis (Cache Hit)', async () => {
      const cachedData = JSON.stringify({ tag_name: 'v1.5.0' });
      (redis.get as any).mockResolvedValue(cachedData);

      const result = await getLatestRelease('owner', 'repo');

      expect(result).toBe('v1.5.0');

      expect(axios.get).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('should return null and cache it if release is not found (404)', async () => {
      (redis.get as any).mockResolvedValue(null);
      const notFoundError = { isAxiosError: true, response: { status: 404 } };
      (axios.get as any).mockRejectedValue(notFoundError);
      (redis.set as any).mockResolvedValue('OK');

      const result = await getLatestRelease('owner', 'repo');

      expect(result).toBeNull();

      expect(redis.set).toHaveBeenCalledWith('github:/repos/owner/repo/releases/latest', 'null', {
        EX: 600,
      });
    });
  });
});
