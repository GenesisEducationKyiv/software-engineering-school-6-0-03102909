import type { PgBoss } from 'pg-boss';
import type { IJobQueue } from '../interfaces/infrastructure.interfaces.js';

const QUEUE_NAME = 'send-email';

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

export class EmailJobQueue implements IJobQueue {
  constructor(private readonly boss: PgBoss) {}

  async enqueueConfirmationEmail(to: string, repo: string, confirmToken: string): Promise<void> {
    await this.boss.send(
      QUEUE_NAME,
      { type: 'confirmation', to, repo, confirmToken },
      { retryLimit: 3, retryDelay: 30 },
    );
  }

  async enqueueReleaseNotification(
    to: string,
    repo: string,
    tag: string,
    unsubscribeToken: string,
  ): Promise<void> {
    await this.boss.send(
      QUEUE_NAME,
      { type: 'release', to, repo, tag, unsubscribeToken },
      { retryLimit: 3, retryDelay: 30 },
    );
  }
}
