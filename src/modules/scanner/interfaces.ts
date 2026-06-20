import type { Repository } from '../../generated/prisma/client.js';

export interface IRepositoryRepository {
  findAllWithConfirmedSubscriptions(): Promise<Repository[]>;
  updateLastSeenTag(id: string, tag: string): Promise<Repository>;
}
