import type { Subscription } from '../../generated/prisma/client.js';

export interface SubscriptionWithSubscriber {
  unsubscribeToken: string;
  subscriber: { email: string };
}

export interface SubscriptionWithRelations {
  isConfirmed: boolean;
  subscriber: { email: string };
  repository: { owner: string; name: string; lastSeenTag: string | null };
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
