import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpError } from '../../../shared/errors/HttpError.js';
import { SubscriptionService } from './subscription.service.js';
import type { ISubscriptionRepository } from '../interfaces.js';
import type { IGithubClient } from '../../../shared/github/index.js';
import type { IConfirmationEmailQueue } from '../../../shared/mailer/index.js';
import type { Logger } from '../../../config/logger.js';

function createMocks() {
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

  const jobQueue: IConfirmationEmailQueue = {
    enqueueConfirmationEmail: vi.fn(),
  };

  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as Logger;

  const service = new SubscriptionService(subscriptionRepo, githubClient, jobQueue, mockLogger);

  return { subscriptionRepo, githubClient, jobQueue, service, mockLogger };
}

describe('SubscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribe()', () => {
    it('should successfully create a subscription and enqueue a confirmation email', async () => {
      const { subscriptionRepo, githubClient, jobQueue, service } = createMocks();

      const mockEmail = 'test@example.com';
      const mockRepo = 'owner/repo';
      const mockSubscription = { confirmToken: 'fake-token', isConfirmed: false };

      (githubClient.validateRepository as any).mockResolvedValue({ owner: 'owner', name: 'repo' });
      (githubClient.getLatestRelease as any).mockResolvedValue('v1.0.0');
      (subscriptionRepo.createOrGet as any).mockResolvedValue({
        subscription: mockSubscription,
        created: true,
      });

      const result = await service.subscribe(mockEmail, mockRepo);

      expect(result).toEqual(mockSubscription);
      expect(githubClient.validateRepository).toHaveBeenCalledWith('owner', 'repo');
      expect(githubClient.getLatestRelease).toHaveBeenCalledWith('owner', 'repo');
      expect(subscriptionRepo.createOrGet).toHaveBeenCalledWith(
        mockEmail,
        'owner',
        'repo',
        'v1.0.0',
      );
      expect(jobQueue.enqueueConfirmationEmail).toHaveBeenCalledWith({
        to: mockEmail,
        repo: mockRepo,
        confirmToken: 'fake-token',
      });
    });

    it('should throw a 409 conflict error if user is already subscribed and confirmed', async () => {
      const { subscriptionRepo, githubClient, jobQueue, service } = createMocks();

      (githubClient.validateRepository as any).mockResolvedValue({ owner: 'owner', name: 'repo' });
      (githubClient.getLatestRelease as any).mockRejectedValue(new Error('Not found'));
      (subscriptionRepo.createOrGet as any).mockResolvedValue({
        subscription: { isConfirmed: true },
        created: false,
      });

      await expect(service.subscribe('test@example.com', 'owner/repo')).rejects.toThrow(HttpError);
      await expect(service.subscribe('test@example.com', 'owner/repo')).rejects.toThrow(
        'Email is already subscribed',
      );
      expect(jobQueue.enqueueConfirmationEmail).not.toHaveBeenCalled();
    });

    it('should throw an error if the GitHub repository is invalid or not found', async () => {
      const { subscriptionRepo, githubClient, service } = createMocks();

      (githubClient.validateRepository as any).mockRejectedValue(new Error('Not found on GitHub'));

      await expect(service.subscribe('test@example.com', 'invalid/repo')).rejects.toThrow(
        'Not found on GitHub',
      );
      expect(subscriptionRepo.createOrGet).not.toHaveBeenCalled();
    });
  });

  describe('confirmSubscription()', () => {
    it('should successfully confirm a subscription with a valid token', async () => {
      const { subscriptionRepo, service } = createMocks();

      const mockSub = { id: 1, isConfirmed: true };
      (subscriptionRepo.confirmToken as any).mockResolvedValue(mockSub);

      const result = await service.confirmSubscription('valid-token');

      expect(result).toEqual(mockSub);
      expect(subscriptionRepo.confirmToken).toHaveBeenCalledWith('valid-token');
    });

    it('should throw a 404 error if the confirmation token is not found', async () => {
      const { subscriptionRepo, service } = createMocks();

      (subscriptionRepo.confirmToken as any).mockResolvedValue(null);

      await expect(service.confirmSubscription('bad-token')).rejects.toThrow(HttpError);
      await expect(service.confirmSubscription('bad-token')).rejects.toThrow('Token not found');
    });
  });

  describe('unsubscribe()', () => {
    it('should successfully remove a subscription with a valid unsubscribe token', async () => {
      const { subscriptionRepo, service } = createMocks();

      (subscriptionRepo.removeByUnsubscribeToken as any).mockResolvedValue(true);

      await expect(service.unsubscribe('valid-token')).resolves.toBeUndefined();
      expect(subscriptionRepo.removeByUnsubscribeToken).toHaveBeenCalledWith('valid-token');
    });

    it('should throw a 404 error if the unsubscribe token is not found', async () => {
      const { subscriptionRepo, service } = createMocks();

      (subscriptionRepo.removeByUnsubscribeToken as any).mockResolvedValue(false);

      await expect(service.unsubscribe('invalid-token')).rejects.toThrow(HttpError);
      await expect(service.unsubscribe('invalid-token')).rejects.toThrow('Token not found');
    });
  });

  describe('getSubscriptions()', () => {
    it('should return a formatted list of subscriptions for a given email', async () => {
      const { subscriptionRepo, service } = createMocks();

      const mockEmail = 'test@example.com';
      const mockDbData = [
        {
          isConfirmed: true,
          subscriber: { email: mockEmail },
          repository: { owner: 'facebook', name: 'react', lastSeenTag: 'v18.2.0' },
        },
        {
          isConfirmed: false,
          subscriber: { email: mockEmail },
          repository: { owner: 'vuejs', name: 'core', lastSeenTag: null },
        },
      ];

      (subscriptionRepo.findByEmail as any).mockResolvedValue(mockDbData);

      const result = await service.getSubscriptions(mockEmail);

      expect(subscriptionRepo.findByEmail).toHaveBeenCalledWith(mockEmail);
      expect(result).toEqual([
        {
          email: mockEmail,
          repo: 'facebook/react',
          confirmed: true,
          last_seen_tag: 'v18.2.0',
        },
        {
          email: mockEmail,
          repo: 'vuejs/core',
          confirmed: false,
          last_seen_tag: '',
        },
      ]);
    });
  });
});
