import type { PrismaClient } from '../generated/prisma/client.js';
import type { IRepositoryRepository } from '../interfaces/repository.interfaces.js';

export class RepositoryRepository implements IRepositoryRepository {
  constructor(private db: PrismaClient) {}

  async findAllWithConfirmedSubscriptions() {
    return await this.db.repository.findMany({
      where: {
        subscriptions: {
          some: { isConfirmed: true },
        },
      },
    });
  }

  async updateLastSeenTag(id: string, tag: string) {
    return await this.db.repository.update({
      where: { id },
      data: { lastSeenTag: tag },
    });
  }
}
