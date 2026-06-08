import type { PgBoss } from 'pg-boss';
import type { ConfirmationEmailDto } from './interfaces.js';

export const QUEUE_NAME = 'send-confirmation-email';

export class ConfirmationEmailQueue {
  constructor(private readonly boss: PgBoss) {}

  async enqueueConfirmationEmail(data: ConfirmationEmailDto): Promise<void> {
    await this.boss.send(QUEUE_NAME, data, { retryLimit: 3, retryDelay: 30 });
  }
}
