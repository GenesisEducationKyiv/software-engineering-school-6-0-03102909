import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { GithubService, GithubNotFoundError } from '../github.service.js';

vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
  };
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      isAxiosError: vi.fn(),
    },
  };
});

vi.mock('../../config/env.js', () => ({
  default: { GITHUB_TOKEN: 'fake-github-token' },
}));

function createMocks() {
  const cache = {
    get: vi.fn(),
    set: vi.fn(),
  } as any;

  const service = new GithubService(cache);
  const mockHttpClient = (axios.create as any).mock.results[0].value;

  return { cache, service, mockHttpClient };
}

describe('GithubService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (axios.isAxiosError as any).mockImplementation((err: any) => err?.isAxiosError === true);
  });

  describe('validateRepository()', () => {
    it('should return owner and name if repository exists (Cache Miss)', async () => {
      const { cache, service, mockHttpClient } = createMocks();

      (cache.get as any).mockResolvedValue(null);
      mockHttpClient.get.mockResolvedValue({ data: { id: 12345, full_name: 'owner/repo' } });

      (cache.set as any).mockResolvedValue(undefined);

      const result = await service.validateRepository('owner', 'repo');

      expect(result).toEqual({ owner: 'owner', name: 'repo' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/repos/owner/repo');

      expect(cache.set).toHaveBeenCalledTimes(1);
    });

    it('should throw GithubNotFoundError if repository is not found', async () => {
      const { cache, service, mockHttpClient } = createMocks();

      (cache.get as any).mockResolvedValue(null);

      const notFoundError = {
        isAxiosError: true,
        response: { status: 404 },
      };
      mockHttpClient.get.mockRejectedValue(notFoundError);

      await expect(service.validateRepository('bad-owner', 'bad-repo')).rejects.toThrow(
        GithubNotFoundError,
      );
      await expect(service.validateRepository('bad-owner', 'bad-repo')).rejects.toThrow(
        'Repository bad-owner/bad-repo not found',
      );
    });

    it('should throw GithubRateLimitError on Rate Limit (403 or 429)', async () => {
      const { cache, service, mockHttpClient } = createMocks();

      (cache.get as any).mockResolvedValue(null);
      const rateLimitError = { isAxiosError: true, response: { status: 403 } };
      mockHttpClient.get.mockRejectedValue(rateLimitError);

      await expect(service.validateRepository('owner', 'repo')).rejects.toThrow(
        'GitHub API rate limit exceeded',
      );
    });
  });

  describe('getLatestRelease()', () => {
    it('should return the latest tag name from GitHub API (Cache Miss)', async () => {
      const { cache, service, mockHttpClient } = createMocks();

      (cache.get as any).mockResolvedValue(null);
      mockHttpClient.get.mockResolvedValue({ data: { tag_name: 'v2.0.0' } });
      (cache.set as any).mockResolvedValue(undefined);

      const result = await service.getLatestRelease('owner', 'repo');

      expect(result).toBe('v2.0.0');
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
      expect(cache.set).toHaveBeenCalledTimes(1);
    });

    it('should return the latest tag name from cache (Cache Hit)', async () => {
      const { cache, service, mockHttpClient } = createMocks();

      const cachedData = JSON.stringify({ tag_name: 'v1.5.0' });
      (cache.get as any).mockResolvedValue(cachedData);

      const result = await service.getLatestRelease('owner', 'repo');

      expect(result).toBe('v1.5.0');

      expect(mockHttpClient.get).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('should throw GithubNotFoundError if release is not found', async () => {
      const { cache, service, mockHttpClient } = createMocks();

      (cache.get as any).mockResolvedValue(null);
      const notFoundError = { isAxiosError: true, response: { status: 404 } };
      mockHttpClient.get.mockRejectedValue(notFoundError);

      await expect(service.getLatestRelease('owner', 'repo')).rejects.toThrow(GithubNotFoundError);
      await expect(service.getLatestRelease('owner', 'repo')).rejects.toThrow('Not found');
    });
  });
});
