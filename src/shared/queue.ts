import type { PgBoss } from 'pg-boss';

export interface ConfirmationEmailDto {
  to: string;
  repo: string;
  confirmToken: string;
}

export interface ReleaseNotificationDto {
  to: string;
  repo: string;
  tag: string;
  unsubscribeToken: string;
}

export interface IConfirmationEmailQueue {
  enqueueConfirmationEmail(data: ConfirmationEmailDto): Promise<void>;
}

export interface IReleaseNotificationQueue {
  enqueueReleaseNotification(data: ReleaseNotificationDto): Promise<void>;
}

export const CONFIRMATION_QUEUE_NAME = 'send-confirmation-email';
export const RELEASE_QUEUE_NAME = 'send-release-notification';

export class NotificationQueue implements IConfirmationEmailQueue, IReleaseNotificationQueue {
  private queuesCreated = false;

  constructor(private readonly boss: PgBoss) {}

  private async ensureQueues(): Promise<void> {
    if (!this.queuesCreated) {
      await this.boss.createQueue(CONFIRMATION_QUEUE_NAME);
      await this.boss.createQueue(RELEASE_QUEUE_NAME);
      this.queuesCreated = true;
    }
  }

  async enqueueConfirmationEmail(data: ConfirmationEmailDto): Promise<void> {
    await this.ensureQueues();
    await this.boss.send(CONFIRMATION_QUEUE_NAME, data, { retryLimit: 3, retryDelay: 30 });
  }

  async enqueueReleaseNotification(data: ReleaseNotificationDto): Promise<void> {
    await this.ensureQueues();
    await this.boss.send(RELEASE_QUEUE_NAME, data, { retryLimit: 3, retryDelay: 30 });
  }
}
