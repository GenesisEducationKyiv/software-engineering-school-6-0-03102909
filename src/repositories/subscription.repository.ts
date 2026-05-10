import prisma from '../db/prisma.js';
import type { ISubscriptionRepository } from '../interfaces/repository.interfaces.js';

export const subscriptionRepository: ISubscriptionRepository = {
  async createOrGet(
    email: string,
    owner: string,
    name: string,
    latestTag: string | null = null
  ) {
    return await prisma.$transaction(async (tx) => {
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
  },

  async confirmToken(token: string) {
    const existing = await prisma.subscription.findUnique({
      where: { confirmToken: token },
    });

    if (!existing) {
      return null;
    }

    if (existing.isConfirmed) {
      return existing;
    }

    return await prisma.subscription.update({
      where: { id: existing.id },
      data: { isConfirmed: true },
    });
  },

  async removeByUnsubscribeToken(token: string) {
    const existing = await prisma.subscription.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!existing) {
      return false;
    }

    await prisma.subscription.delete({
      where: { id: existing.id },
    });

    return true;
  },

  async findByEmail(email: string) {
    return await prisma.subscription.findMany({
      where: {
        subscriber: { email: email },
      },
      include: {
        repository: true,
        subscriber: true,
      },
    });
  },

  async findConfirmedSubscribersByRepo(repositoryId: string) {
    return await prisma.subscription.findMany({
      where: {
        repositoryId,
        isConfirmed: true,
      },
      include: {
        subscriber: true,
      },
    });
  },
};
