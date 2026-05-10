import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScannerService } from '../scanner.service.js';
import { GithubApiError } from '../github.service.js';
import type { IRepositoryRepository, ISubscriptionRepository } from '../../interfaces/repository.interfaces.js';
import type { IGithubClient, IJobQueue } from '../../interfaces/infrastructure.interfaces.js';

function createMocks() {
  const repositoryRepo: IRepositoryRepository = {
    findAllWithConfirmedSubscriptions: vi.fn(),
    updateLastSeenTag: vi.fn(),
  };

  const subscriptionRepo: ISubscriptionRepository = {
    createOrGet: vi.fn(),
    confirmToken: vi.fn(),
    removeByUnsubscribeToken: vi.fn(),
    findByEmail: vi.fn(),
    findConfirmedSubscribersByRepo: vi.fn(),
  };

  const githubClient: IGithubClient = {
    validateRepository: vi.fn(),
    getLatestRelease: vi.fn(),
  };

  const jobQueue: IJobQueue = {
    enqueueConfirmationEmail: vi.fn(),
    enqueueReleaseNotification: vi.fn(),
  };

  const scannerService = new ScannerService(repositoryRepo, subscriptionRepo, githubClient, jobQueue);

  return { repositoryRepo, subscriptionRepo, githubClient, jobQueue, scannerService };
}

describe('ScannerService', () => {
  let _consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    _consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should process new releases and enqueue emails for all subscribers', async () => {
    const { repositoryRepo, subscriptionRepo, githubClient, jobQueue, scannerService } = createMocks();

    const mockRepos = [{ id: 1, owner: 'facebook', name: 'react', lastSeenTag: 'v18.0.0' }];
    const mockSubscribers = [
      { subscriber: { email: 'user1@test.com' }, unsubscribeToken: 'token1' },
      { subscriber: { email: 'user2@test.com' }, unsubscribeToken: 'token2' },
    ];

    (repositoryRepo.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);
    (githubClient.getLatestRelease as any).mockResolvedValue('v18.2.0');
    (subscriptionRepo.findConfirmedSubscribersByRepo as any).mockResolvedValue(mockSubscribers);

    await scannerService.scanAllRepositories();

    expect(githubClient.getLatestRelease).toHaveBeenCalledWith('facebook', 'react');

    expect(jobQueue.enqueueReleaseNotification).toHaveBeenCalledTimes(2);
    expect(jobQueue.enqueueReleaseNotification).toHaveBeenCalledWith(
      'user1@test.com',
      'facebook/react',
      'v18.2.0',
      'token1',
    );
    expect(jobQueue.enqueueReleaseNotification).toHaveBeenCalledWith(
      'user2@test.com',
      'facebook/react',
      'v18.2.0',
      'token2',
    );

    expect(repositoryRepo.updateLastSeenTag).toHaveBeenCalledWith(1, 'v18.2.0');
  });

  it('should skip repository if there is no new release', async () => {
    const { repositoryRepo, subscriptionRepo, githubClient, jobQueue, scannerService } = createMocks();

    const mockRepos = [{ id: 1, owner: 'facebook', name: 'react', lastSeenTag: 'v18.2.0' }];
    (repositoryRepo.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);
    (githubClient.getLatestRelease as any).mockResolvedValue('v18.2.0');

    await scannerService.scanAllRepositories();

    expect(subscriptionRepo.findConfirmedSubscribersByRepo).not.toHaveBeenCalled();
    expect(jobQueue.enqueueReleaseNotification).not.toHaveBeenCalled();
    expect(repositoryRepo.updateLastSeenTag).not.toHaveBeenCalled();
  });

  it('should stop scanning remaining repos if GitHub rate limit (503) is hit', async () => {
    const { repositoryRepo, githubClient, scannerService } = createMocks();

    const mockRepos = [
      { id: 1, owner: 'facebook', name: 'react', lastSeenTag: 'v18.0.0' },
      { id: 2, owner: 'vuejs', name: 'vue', lastSeenTag: 'v3.0.0' },
    ];

    (repositoryRepo.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);

    (githubClient.getLatestRelease as any).mockRejectedValueOnce(new GithubApiError('Rate Limit', 503));

    await scannerService.scanAllRepositories();

    expect(githubClient.getLatestRelease).toHaveBeenCalledTimes(1);
    expect(githubClient.getLatestRelease).toHaveBeenCalledWith('facebook', 'react');
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('rate-limited'));
  });

  it('should continue scanning other repos if a generic error occurs on one', async () => {
    const { repositoryRepo, subscriptionRepo, githubClient, scannerService } = createMocks();

    const mockRepos = [
      { id: 1, owner: 'bad', name: 'repo', lastSeenTag: 'v1.0' },
      { id: 2, owner: 'good', name: 'repo', lastSeenTag: 'v1.0' },
    ];

    (repositoryRepo.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);

    (githubClient.getLatestRelease as any)
      .mockRejectedValueOnce(new Error('Network offline'))
      .mockResolvedValueOnce('v2.0');

    (subscriptionRepo.findConfirmedSubscribersByRepo as any).mockResolvedValue([]);

    await scannerService.scanAllRepositories();

    expect(githubClient.getLatestRelease).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('scanner error scanning bad/repo'),
      expect.any(Error),
    );
  });

  it('should continue notifying other subscribers if enqueueing fails for one', async () => {
    const { repositoryRepo, subscriptionRepo, githubClient, jobQueue, scannerService } = createMocks();

    const mockRepos = [{ id: 1, owner: 'test', name: 'repo', lastSeenTag: 'v1.0' }];
    const mockSubscribers = [
      { subscriber: { email: 'fail@test.com' }, unsubscribeToken: 'token1' },
      { subscriber: { email: 'success@test.com' }, unsubscribeToken: 'token2' },
    ];

    (repositoryRepo.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);
    (githubClient.getLatestRelease as any).mockResolvedValue('v2.0');
    (subscriptionRepo.findConfirmedSubscribersByRepo as any).mockResolvedValue(mockSubscribers);

    (jobQueue.enqueueReleaseNotification as any)
      .mockRejectedValueOnce(new Error('Queue full'))
      .mockResolvedValueOnce(undefined);

    await scannerService.scanAllRepositories();

    expect(jobQueue.enqueueReleaseNotification).toHaveBeenCalledTimes(2); // Спробували відправити обом!
    expect(repositoryRepo.updateLastSeenTag).toHaveBeenCalledWith(1, 'v2.0'); // Тег все одно оновився
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('failed to enqueue notification for fail@test.com'),
      expect.any(Error),
    );
  });
});
