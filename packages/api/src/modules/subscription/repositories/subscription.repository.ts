import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { ISubscriptionRepository } from '../interfaces.js';

export class SubscriptionRepository implements ISubscriptionRepository {
  constructor(private db: PrismaClient) {}

  async createOrGet(email: string, owner: string, name: string, latestTag: string | null = null) {
    return await this.db.$transaction(async (tx) => {
      const repository = await tx.repository.upsert({
        where: { owner_name: { owner, name } },
        update: {},
        create: { owner, name, lastSeenTag: latestTag },
      });

      const subscriber = await tx.subscriber.upsert({
        where: { email },
        update: {},
        create: { email },
      });

      const existing = await tx.subscription.findUnique({
        where: {
          subscriberId_repositoryId: {
            subscriberId: subscriber.id,
            repositoryId: repository.id,
          },
        },
      });

      if (existing) {
        return { subscription: existing, created: false };
      }

      const subscription = await tx.subscription.create({
        data: {
          subscriberId: subscriber.id,
          repositoryId: repository.id,
          isConfirmed: false,
        },
      });

      return { subscription, created: true };
    });
  }

  async confirmToken(token: string) {
    const existing = await this.db.subscription.findUnique({
      where: { confirmToken: token },
    });

    if (!existing) {
      return null;
    }

    if (existing.isConfirmed) {
      return existing;
    }

    return await this.db.subscription.update({
      where: { id: existing.id },
      data: { isConfirmed: true },
    });
  }

  async removeByUnsubscribeToken(token: string) {
    const result = await this.db.subscription.deleteMany({
      where: { unsubscribeToken: token },
    });
    return result.count > 0;
  }

  async removePendingByConfirmToken(token: string) {
    const result = await this.db.subscription.deleteMany({
      where: {
        confirmToken: token,
        isConfirmed: false,
      },
    });
    return result.count > 0;
  }

  async findByEmail(email: string) {
    return await this.db.subscription.findMany({
      where: {
        subscriber: { email: email },
      },
      include: {
        repository: true,
        subscriber: true,
      },
    });
  }

  async findConfirmedSubscribersByRepo(repositoryId: string) {
    return await this.db.subscription.findMany({
      where: {
        repositoryId,
        isConfirmed: true,
      },
      include: {
        subscriber: true,
      },
    });
  }
}
