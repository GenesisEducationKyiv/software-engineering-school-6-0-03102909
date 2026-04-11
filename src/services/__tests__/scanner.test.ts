import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../repositories/repository.repository.js', () => ({
  repositoryRepository: {
    findAllWithConfirmedSubscriptions: vi.fn(),
    updateLastSeenTag: vi.fn(),
  },
}));

vi.mock('../../repositories/subscription.repository.js', () => ({
  subscriptionRepository: {
    findConfirmedSubscribersByRepo: vi.fn(),
  },
}));

vi.mock('../../jobs/email.job.js', () => ({
  enqueueReleaseNotification: vi.fn(),
}));

vi.mock('../github.service.js', async () => {
  const actual =
    await vi.importActual<typeof import('../github.service.js')>('../github.service.js');
  return {
    ...actual,
    getLatestRelease: vi.fn(),
  };
});

import { repositoryRepository } from '../../repositories/repository.repository.js';
import { subscriptionRepository } from '../../repositories/subscription.repository.js';
import { getLatestRelease, GithubApiError } from '../github.service.js';
import { enqueueReleaseNotification } from '../../jobs/email.job.js';
import { scannerService } from '../scanner.service.js';

describe('ScannerService', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should process new releases and enqueue emails for all subscribers', async () => {
    const mockRepos = [{ id: 1, owner: 'facebook', name: 'react', lastSeenTag: 'v18.0.0' }];
    const mockSubscribers = [
      { subscriber: { email: 'user1@test.com' }, unsubscribeToken: 'token1' },
      { subscriber: { email: 'user2@test.com' }, unsubscribeToken: 'token2' },
    ];

    (repositoryRepository.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);
    (getLatestRelease as any).mockResolvedValue('v18.2.0');
    (subscriptionRepository.findConfirmedSubscribersByRepo as any).mockResolvedValue(
      mockSubscribers,
    );

    await scannerService.scanAllRepositories();

    expect(getLatestRelease).toHaveBeenCalledWith('facebook', 'react');

    expect(enqueueReleaseNotification).toHaveBeenCalledTimes(2);
    expect(enqueueReleaseNotification).toHaveBeenCalledWith(
      'user1@test.com',
      'facebook/react',
      'v18.2.0',
      'token1',
    );
    expect(enqueueReleaseNotification).toHaveBeenCalledWith(
      'user2@test.com',
      'facebook/react',
      'v18.2.0',
      'token2',
    );

    expect(repositoryRepository.updateLastSeenTag).toHaveBeenCalledWith(1, 'v18.2.0');
  });

  it('should skip repository if there is no new release', async () => {
    const mockRepos = [{ id: 1, owner: 'facebook', name: 'react', lastSeenTag: 'v18.2.0' }];
    (repositoryRepository.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);
    (getLatestRelease as any).mockResolvedValue('v18.2.0');

    await scannerService.scanAllRepositories();

    expect(subscriptionRepository.findConfirmedSubscribersByRepo).not.toHaveBeenCalled();
    expect(enqueueReleaseNotification).not.toHaveBeenCalled();
    expect(repositoryRepository.updateLastSeenTag).not.toHaveBeenCalled();
  });

  it('should stop scanning remaining repos if GitHub rate limit (503) is hit', async () => {
    const mockRepos = [
      { id: 1, owner: 'facebook', name: 'react', lastSeenTag: 'v18.0.0' },
      { id: 2, owner: 'vuejs', name: 'vue', lastSeenTag: 'v3.0.0' },
    ];

    (repositoryRepository.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);

    (getLatestRelease as any).mockRejectedValueOnce(new GithubApiError('Rate Limit', 503));

    await scannerService.scanAllRepositories();

    expect(getLatestRelease).toHaveBeenCalledTimes(1);
    expect(getLatestRelease).toHaveBeenCalledWith('facebook', 'react');
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('rate-limited'));
  });

  it('should continue scanning other repos if a generic error occurs on one', async () => {
    const mockRepos = [
      { id: 1, owner: 'bad', name: 'repo', lastSeenTag: 'v1.0' },
      { id: 2, owner: 'good', name: 'repo', lastSeenTag: 'v1.0' },
    ];

    (repositoryRepository.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);

    (getLatestRelease as any)
      .mockRejectedValueOnce(new Error('Network offline'))
      .mockResolvedValueOnce('v2.0');

    (subscriptionRepository.findConfirmedSubscribersByRepo as any).mockResolvedValue([]);

    await scannerService.scanAllRepositories();

    expect(getLatestRelease).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('scanner error scanning bad/repo'),
      expect.any(Error),
    );
  });

  it('should continue notifying other subscribers if enqueueing fails for one', async () => {
    const mockRepos = [{ id: 1, owner: 'test', name: 'repo', lastSeenTag: 'v1.0' }];
    const mockSubscribers = [
      { subscriber: { email: 'fail@test.com' }, unsubscribeToken: 'token1' },
      { subscriber: { email: 'success@test.com' }, unsubscribeToken: 'token2' },
    ];

    (repositoryRepository.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);
    (getLatestRelease as any).mockResolvedValue('v2.0');
    (subscriptionRepository.findConfirmedSubscribersByRepo as any).mockResolvedValue(
      mockSubscribers,
    );

    (enqueueReleaseNotification as any)
      .mockRejectedValueOnce(new Error('Queue full'))
      .mockResolvedValueOnce(undefined);

    await scannerService.scanAllRepositories();

    expect(enqueueReleaseNotification).toHaveBeenCalledTimes(2); // Спробували відправити обом!
    expect(repositoryRepository.updateLastSeenTag).toHaveBeenCalledWith(1, 'v2.0'); // Тег все одно оновився
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('failed to enqueue notification for fail@test.com'),
      expect.any(Error),
    );
  });
});
