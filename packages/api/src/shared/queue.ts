import type { ChannelWrapper } from 'amqp-connection-manager';
import {
  EXCHANGE_NAME,
  QUEUE_CONFIG,
  type ConfirmationEmailDto,
  type ReleaseNotificationDto,
} from '@github-release-notification/shared';

export interface IConfirmationEmailQueue {
  enqueueConfirmationEmail(data: ConfirmationEmailDto): Promise<void>;
}

export interface IReleaseNotificationQueue {
  enqueueReleaseNotification(data: ReleaseNotificationDto): Promise<void>;
}

export class NotificationQueue implements IConfirmationEmailQueue, IReleaseNotificationQueue {
  constructor(private readonly channel: ChannelWrapper) {}

  async enqueueConfirmationEmail(data: ConfirmationEmailDto): Promise<void> {
    await this.channel.publish(EXCHANGE_NAME, QUEUE_CONFIG.CONFIRMATION_EMAIL.routingKey, data, {
      persistent: true,
    });
  }

  async enqueueReleaseNotification(data: ReleaseNotificationDto): Promise<void> {
    await this.channel.publish(EXCHANGE_NAME, QUEUE_CONFIG.RELEASE_NOTIFICATION.routingKey, data, {
      persistent: true,
    });
  }
}
