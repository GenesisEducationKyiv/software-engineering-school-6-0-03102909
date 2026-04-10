import prisma from '../db/prisma.js';
import type { Subscription } from '../generated/prisma/client.js';

export const subscriptionRepository = {
  async createOrGet(
    email: string,
    owner: string,
    name: string,
  ): Promise<{ subscription: Subscription; created: boolean }> {
    return await prisma.$transaction(async (tx) => {
      const repository = await tx.repository.upsert({
        where: { owner_name: { owner, name } },
        update: {},
        create: { owner, name },
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
};
