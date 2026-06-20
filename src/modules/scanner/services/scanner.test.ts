import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScannerService } from './scanner.service.js';
import { GithubRateLimitError } from '../../../shared/github/index.js';
import type { ISubscriptionRepository } from '../../subscription/index.js';
import type { IRepositoryRepository } from '../interfaces.js';
import type { IGithubClient } from '../../../shared/github/index.js';
import type { IReleaseNotificationQueue } from '../../../shared/queue.js';
import type { Logger } from '../../../shared/logger.js';

function createMocks() {
  const repositoryRepo: IRepositoryRepository = {
    findAllWithConfirmedSubscriptions: vi.fn(),
    updateLastSeenTag: vi.fn(),
  };

  const githubClient: IGithubClient = {
    validateRepository: vi.fn(),
    getLatestRelease: vi.fn(),
  };

  const subscriptionRepo = {
    findConfirmedSubscribersByRepo: vi.fn(),
  } as unknown as ISubscriptionRepository;

  const releaseQueue = {
    enqueueReleaseNotification: vi.fn(),
  } as unknown as IReleaseNotificationQueue;

  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as Logger;

  const scannerService = new ScannerService(
    repositoryRepo,
    githubClient,
    subscriptionRepo,
    releaseQueue,
    mockLogger,
  );

  return {
    repositoryRepo,
    githubClient,
    subscriptionRepo,
    releaseQueue,
    scannerService,
    mockLogger,
  };
}

describe('ScannerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should process new releases and notify subscribers', async () => {
    const { repositoryRepo, githubClient, subscriptionRepo, releaseQueue, scannerService } =
      createMocks();

    const mockRepos = [{ id: 1, owner: 'facebook', name: 'react', lastSeenTag: 'v18.0.0' }];

    (repositoryRepo.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);
    (githubClient.getLatestRelease as any).mockResolvedValue('v18.2.0');
    (subscriptionRepo.findConfirmedSubscribersByRepo as any).mockResolvedValue([
      { subscriber: { email: 'user@test.com' }, unsubscribeToken: 'tok1' },
    ]);

    await scannerService.scanAllRepositories();

    expect(githubClient.getLatestRelease).toHaveBeenCalledWith('facebook', 'react');
    expect(releaseQueue.enqueueReleaseNotification).toHaveBeenCalledWith({
      to: 'user@test.com',
      repo: 'facebook/react',
      tag: 'v18.2.0',
      unsubscribeToken: 'tok1',
    });
    expect(repositoryRepo.updateLastSeenTag).toHaveBeenCalledWith(1, 'v18.2.0');
  });

  it('should skip repository if there is no new release', async () => {
    const { repositoryRepo, releaseQueue, githubClient, scannerService } = createMocks();

    const mockRepos = [{ id: 1, owner: 'facebook', name: 'react', lastSeenTag: 'v18.2.0' }];
    (repositoryRepo.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);
    (githubClient.getLatestRelease as any).mockResolvedValue('v18.2.0');

    await scannerService.scanAllRepositories();

    expect(releaseQueue.enqueueReleaseNotification).not.toHaveBeenCalled();
    expect(repositoryRepo.updateLastSeenTag).not.toHaveBeenCalled();
  });

  it('should stop scanning remaining repos if GitHub rate limit (503) is hit', async () => {
    const { repositoryRepo, githubClient, scannerService, mockLogger } = createMocks();

    const mockRepos = [
      { id: 1, owner: 'facebook', name: 'react', lastSeenTag: 'v18.0.0' },
      { id: 2, owner: 'vuejs', name: 'vue', lastSeenTag: 'v3.0.0' },
    ];

    (repositoryRepo.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);
    (githubClient.getLatestRelease as any).mockRejectedValueOnce(new GithubRateLimitError());

    await scannerService.scanAllRepositories();

    expect(githubClient.getLatestRelease).toHaveBeenCalledTimes(1);
    expect(githubClient.getLatestRelease).toHaveBeenCalledWith('facebook', 'react');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'github rate limit exceeded, skipping remaining repositories',
    );
  });

  it('should continue scanning other repos if a generic error occurs on one', async () => {
    const {
      repositoryRepo,
      subscriptionRepo,
      releaseQueue,
      githubClient,
      scannerService,
      mockLogger,
    } = createMocks();

    const mockRepos = [
      { id: 1, owner: 'bad', name: 'repo', lastSeenTag: 'v1.0' },
      { id: 2, owner: 'good', name: 'repo', lastSeenTag: 'v1.0' },
    ];

    (repositoryRepo.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);
    (githubClient.getLatestRelease as any)
      .mockRejectedValueOnce(new Error('Network offline'))
      .mockResolvedValueOnce('v2.0');
    (subscriptionRepo.findConfirmedSubscribersByRepo as any).mockResolvedValue([
      { subscriber: { email: 'user@test.com' }, unsubscribeToken: 'tok1' },
    ]);

    await scannerService.scanAllRepositories();

    expect(githubClient.getLatestRelease).toHaveBeenCalledTimes(2);
    expect(releaseQueue.enqueueReleaseNotification).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      { err: expect.any(Error), repo: 'bad/repo' },
      'error scanning repository',
    );
  });

  it('should still update tag even if one notification fails', async () => {
    const {
      repositoryRepo,
      subscriptionRepo,
      releaseQueue,
      githubClient,
      scannerService,
      mockLogger,
    } = createMocks();

    const mockRepos = [{ id: 1, owner: 'test', name: 'repo', lastSeenTag: 'v1.0' }];

    (repositoryRepo.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);
    (githubClient.getLatestRelease as any).mockResolvedValue('v2.0');
    (subscriptionRepo.findConfirmedSubscribersByRepo as any).mockResolvedValue([
      { subscriber: { email: 'fail@test.com' }, unsubscribeToken: 'tok1' },
      { subscriber: { email: 'ok@test.com' }, unsubscribeToken: 'tok2' },
    ]);
    (releaseQueue.enqueueReleaseNotification as any)
      .mockRejectedValueOnce(new Error('Resend down'))
      .mockResolvedValueOnce(undefined);

    await scannerService.scanAllRepositories();

    expect(releaseQueue.enqueueReleaseNotification).toHaveBeenCalledTimes(2);
    expect(repositoryRepo.updateLastSeenTag).toHaveBeenCalledWith(1, 'v2.0');
    expect(mockLogger.error).toHaveBeenCalledWith(
      { err: expect.any(Error), repo: 'test/repo', subscriberEmail: 'fail@test.com' },
      'failed to enqueue release notification',
    );
  });
});
