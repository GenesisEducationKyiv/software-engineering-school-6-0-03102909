import prisma from '../db/prisma.js';
import type { IRepositoryRepository } from '../interfaces/repository.interfaces.js';

export const repositoryRepository: IRepositoryRepository = {
  async findAllWithConfirmedSubscriptions() {
    return await prisma.repository.findMany({
      where: {
        subscriptions: {
          some: { isConfirmed: true },
        },
      },
    });
  },

  async updateLastSeenTag(id: string, tag: string) {
    return await prisma.repository.update({
      where: { id },
      data: { lastSeenTag: tag },
    });
  },
};
