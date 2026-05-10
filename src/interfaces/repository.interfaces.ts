import type { Repository, Subscription } from '../generated/prisma/client.js';

export interface SubscriptionWithSubscriber extends Pick<Subscription, 'unsubscribeToken'> {
  subscriber: { email: string };
}

export interface SubscriptionWithRelations extends Pick<Subscription, 'isConfirmed'> {
  subscriber: { email: string };
  repository: { owner: string; name: string; lastSeenTag: string | null };
}

export interface IRepositoryRepository {
  findAllWithConfirmedSubscriptions(): Promise<Repository[]>;
  updateLastSeenTag(id: string, tag: string): Promise<Repository>;
}

export interface ISubscriptionRepository {
  createOrGet(
    email: string,
    owner: string,
    name: string,
    latestTag?: string | null,
  ): Promise<{ subscription: Subscription; created: boolean }>;

  confirmToken(token: string): Promise<Subscription | null>;

  removeByUnsubscribeToken(token: string): Promise<boolean>;

  findByEmail(email: string): Promise<SubscriptionWithRelations[]>;

  findConfirmedSubscribersByRepo(repositoryId: string): Promise<SubscriptionWithSubscriber[]>;
}
