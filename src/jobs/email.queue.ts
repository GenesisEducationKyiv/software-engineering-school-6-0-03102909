import type { PgBoss } from 'pg-boss';
import type {
  IConfirmationEmailQueue,
  IReleaseNotificationQueue,
  ConfirmationEmailDto,
  ReleaseNotificationDto,
} from '../interfaces/infrastructure.interfaces.js';

export const QUEUE_NAME = 'send-email';

export interface ConfirmationPayload {
  type: 'confirmation';
  to: string;
  repo: string;
  confirmToken: string;
}

export interface ReleasePayload {
  type: 'release';
  to: string;
  repo: string;
  tag: string;
  unsubscribeToken: string;
}

export type EmailPayload = ConfirmationPayload | ReleasePayload;

export class EmailJobQueue implements IConfirmationEmailQueue, IReleaseNotificationQueue {
  constructor(private readonly boss: PgBoss) {}

  async enqueueConfirmationEmail(data: ConfirmationEmailDto): Promise<void> {
    await this.boss.send(
      QUEUE_NAME,
      { type: 'confirmation', ...data },
      { retryLimit: 3, retryDelay: 30 },
    );
  }

  async enqueueReleaseNotification(data: ReleaseNotificationDto): Promise<void> {
    await this.boss.send(
      QUEUE_NAME,
      { type: 'release', ...data },
      { retryLimit: 3, retryDelay: 30 },
    );
  }
}
