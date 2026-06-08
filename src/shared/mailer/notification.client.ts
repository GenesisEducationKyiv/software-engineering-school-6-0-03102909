import type { INotificationService } from './interfaces.js';
import type { Logger } from '../../config/logger.js';
import { HttpError } from '../errors/HttpError.js';

export class NotificationClient implements INotificationService {
  private readonly log: Logger;

  constructor(
    private readonly baseUrl: string,
    logger: Logger,
  ) {
    this.log = logger.child({ service: 'NotificationClient' });
  }

  private async request(endpoint: string, payload: unknown, actionLogName: string, logContext: Record<string, string>): Promise<void> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      this.log.error({ status: res.status, errorText, ...logContext }, `failed to send ${actionLogName} via microservice`);
      throw new HttpError(`Notification service error: ${res.status} ${errorText}`, res.status);
    }

    this.log.info(logContext, `${actionLogName} request sent to microservice`);
  }

  async sendConfirmationEmail(to: string, repo: string, confirmToken: string): Promise<void> {
    await this.request(
      '/send-confirmation',
      { to, repo, confirmToken },
      'confirmation email',
      { to, repo }
    );
  }

  async sendReleaseNotification(
    to: string,
    repo: string,
    tag: string,
    unsubscribeToken: string,
  ): Promise<void> {
    await this.request(
      '/send-release',
      { to, repo, tag, unsubscribeToken },
      'release notification',
      { to, repo, tag }
    );
  }
}
