import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScannerService } from '../scanner.service.js';
import { GithubApiError } from '../github.service.js';
import type { IRepositoryRepository } from '../../interfaces/repository.interfaces.js';
import type { IGithubClient } from '../../interfaces/infrastructure.interfaces.js';
import type { NotificationService } from '../notification.service.js';

function createMocks() {
  const repositoryRepo: IRepositoryRepository = {
    findAllWithConfirmedSubscriptions: vi.fn(),
    updateLastSeenTag: vi.fn(),
  };

  const githubClient: IGithubClient = {
    validateRepository: vi.fn(),
    getLatestRelease: vi.fn(),
  };

  const notificationService = {
    notifySubscribers: vi.fn(),
  } as unknown as NotificationService;

  const scannerService = new ScannerService(repositoryRepo, githubClient, notificationService);

  return { repositoryRepo, githubClient, notificationService, scannerService };
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

  it('should process new releases and notify subscribers', async () => {
    const { repositoryRepo, githubClient, notificationService, scannerService } = createMocks();

    const mockRepos = [{ id: 1, owner: 'facebook', name: 'react', lastSeenTag: 'v18.0.0' }];

    (repositoryRepo.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);
    (githubClient.getLatestRelease as any).mockResolvedValue('v18.2.0');

    await scannerService.scanAllRepositories();

    expect(githubClient.getLatestRelease).toHaveBeenCalledWith('facebook', 'react');
    expect(notificationService.notifySubscribers).toHaveBeenCalledWith(
      1,
      'facebook/react',
      'v18.2.0',
    );
    expect(repositoryRepo.updateLastSeenTag).toHaveBeenCalledWith(1, 'v18.2.0');
  });

  it('should skip repository if there is no new release', async () => {
    const { repositoryRepo, notificationService, githubClient, scannerService } = createMocks();

    const mockRepos = [{ id: 1, owner: 'facebook', name: 'react', lastSeenTag: 'v18.2.0' }];
    (repositoryRepo.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);
    (githubClient.getLatestRelease as any).mockResolvedValue('v18.2.0');

    await scannerService.scanAllRepositories();

    expect(notificationService.notifySubscribers).not.toHaveBeenCalled();
    expect(repositoryRepo.updateLastSeenTag).not.toHaveBeenCalled();
  });

  it('should stop scanning remaining repos if GitHub rate limit (503) is hit', async () => {
    const { repositoryRepo, githubClient, scannerService } = createMocks();

    const mockRepos = [
      { id: 1, owner: 'facebook', name: 'react', lastSeenTag: 'v18.0.0' },
      { id: 2, owner: 'vuejs', name: 'vue', lastSeenTag: 'v3.0.0' },
    ];

    (repositoryRepo.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);
    (githubClient.getLatestRelease as any).mockRejectedValueOnce(
      new GithubApiError('Rate Limit', 503),
    );

    await scannerService.scanAllRepositories();

    expect(githubClient.getLatestRelease).toHaveBeenCalledTimes(1);
    expect(githubClient.getLatestRelease).toHaveBeenCalledWith('facebook', 'react');
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('rate-limited'));
  });

  it('should continue scanning other repos if a generic error occurs on one', async () => {
    const { repositoryRepo, notificationService, githubClient, scannerService } = createMocks();

    const mockRepos = [
      { id: 1, owner: 'bad', name: 'repo', lastSeenTag: 'v1.0' },
      { id: 2, owner: 'good', name: 'repo', lastSeenTag: 'v1.0' },
    ];

    (repositoryRepo.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);
    (githubClient.getLatestRelease as any)
      .mockRejectedValueOnce(new Error('Network offline'))
      .mockResolvedValueOnce('v2.0');

    await scannerService.scanAllRepositories();

    expect(githubClient.getLatestRelease).toHaveBeenCalledTimes(2);
    expect(notificationService.notifySubscribers).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('scanner error scanning bad/repo'),
      expect.any(Error),
    );
  });

  it('should still update tag even if notification throws', async () => {
    const { repositoryRepo, notificationService, githubClient, scannerService } = createMocks();

    const mockRepos = [{ id: 1, owner: 'test', name: 'repo', lastSeenTag: 'v1.0' }];

    (repositoryRepo.findAllWithConfirmedSubscriptions as any).mockResolvedValue(mockRepos);
    (githubClient.getLatestRelease as any).mockResolvedValue('v2.0');

    await scannerService.scanAllRepositories();

    expect(notificationService.notifySubscribers).toHaveBeenCalledWith(1, 'test/repo', 'v2.0');
    expect(repositoryRepo.updateLastSeenTag).toHaveBeenCalledWith(1, 'v2.0');
  });
});
