import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpError } from '../../errors/HttpError.js';

vi.mock('../../repositories/subscription.repository.js', () => ({
  subscriptionRepository: {
    createOrGet: vi.fn(),
    confirmToken: vi.fn(),
    removeByUnsubscribeToken: vi.fn(),
    findByEmail: vi.fn(),
  },
}));

vi.mock('../github.service.js', () => ({
  validateRepository: vi.fn(),
  getLatestRelease: vi.fn(),
}));

vi.mock('../../jobs/email.job.js', () => ({
  enqueueConfirmationEmail: vi.fn(),
}));

import { subscriptionRepository } from '../../repositories/subscription.repository.js';
import { validateRepository, getLatestRelease } from '../github.service.js';
import { enqueueConfirmationEmail } from '../../jobs/email.job.js';
import {
  subscribe,
  confirmSubscription,
  unsubscribe,
  getSubscriptions,
} from '../subscription.service.js';

describe('SubscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribe()', () => {
    it('should successfully create a subscription and enqueue a confirmation email', async () => {
      const mockEmail = 'test@example.com';
      const mockRepo = 'owner/repo';
      const mockSubscription = { confirmToken: 'fake-token', isConfirmed: false };

      (validateRepository as any).mockResolvedValue({ owner: 'owner', name: 'repo' });
      (getLatestRelease as any).mockResolvedValue('v1.0.0');
      (subscriptionRepository.createOrGet as any).mockResolvedValue({
        subscription: mockSubscription,
        created: true,
      });

      const result = await subscribe(mockEmail, mockRepo);

      expect(result).toEqual(mockSubscription);
      expect(validateRepository).toHaveBeenCalledWith('owner', 'repo');
      expect(getLatestRelease).toHaveBeenCalledWith('owner', 'repo');
      expect(subscriptionRepository.createOrGet).toHaveBeenCalledWith(mockEmail, 'owner', 'repo', 'v1.0.0');
      expect(enqueueConfirmationEmail).toHaveBeenCalledWith(mockEmail, mockRepo, 'fake-token');
    });

    it('should throw a 409 conflict error if user is already subscribed and confirmed', async () => {
      (validateRepository as any).mockResolvedValue({ owner: 'owner', name: 'repo' });
      (subscriptionRepository.createOrGet as any).mockResolvedValue({
        subscription: { isConfirmed: true },
        created: false,
      });

      await expect(subscribe('test@example.com', 'owner/repo')).rejects.toThrow(HttpError);
      await expect(subscribe('test@example.com', 'owner/repo')).rejects.toThrow(
        'Email is already subscribed',
      );
      expect(enqueueConfirmationEmail).not.toHaveBeenCalled();
    });

    it('should throw an error if the GitHub repository is invalid or not found', async () => {
      (validateRepository as any).mockRejectedValue(new Error('Not found on GitHub'));

      await expect(subscribe('test@example.com', 'invalid/repo')).rejects.toThrow(
        'Not found on GitHub',
      );
      expect(subscriptionRepository.createOrGet).not.toHaveBeenCalled();
    });
  });

  describe('confirmSubscription()', () => {
    it('should successfully confirm a subscription with a valid token', async () => {
      const mockSub = { id: 1, isConfirmed: true };
      (subscriptionRepository.confirmToken as any).mockResolvedValue(mockSub);

      const result = await confirmSubscription('valid-token');

      expect(result).toEqual(mockSub);
      expect(subscriptionRepository.confirmToken).toHaveBeenCalledWith('valid-token');
    });

    it('should throw a 404 error if the confirmation token is not found', async () => {
      (subscriptionRepository.confirmToken as any).mockResolvedValue(null);

      await expect(confirmSubscription('bad-token')).rejects.toThrow(HttpError);
      await expect(confirmSubscription('bad-token')).rejects.toThrow('Token not found');
    });
  });

  describe('unsubscribe()', () => {
    it('should successfully remove a subscription with a valid unsubscribe token', async () => {
      (subscriptionRepository.removeByUnsubscribeToken as any).mockResolvedValue(true);

      await expect(unsubscribe('valid-token')).resolves.toBeUndefined();
      expect(subscriptionRepository.removeByUnsubscribeToken).toHaveBeenCalledWith('valid-token');
    });

    it('should throw a 404 error if the unsubscribe token is not found', async () => {
      (subscriptionRepository.removeByUnsubscribeToken as any).mockResolvedValue(false);

      await expect(unsubscribe('invalid-token')).rejects.toThrow(HttpError);
      await expect(unsubscribe('invalid-token')).rejects.toThrow('Token not found');
    });
  });

  describe('getSubscriptions()', () => {
    it('should return a formatted list of subscriptions for a given email', async () => {
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

      (subscriptionRepository.findByEmail as any).mockResolvedValue(mockDbData);

      const result = await getSubscriptions(mockEmail);

      expect(subscriptionRepository.findByEmail).toHaveBeenCalledWith(mockEmail);
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
