import type { Channel } from 'amqplib';
import { EXCHANGE_NAME, QUEUE_CONFIG } from './messaging/rabbitmq.js';

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

export class NotificationQueue implements IConfirmationEmailQueue, IReleaseNotificationQueue {
  constructor(private readonly channel: Channel) {}

  async enqueueConfirmationEmail(data: ConfirmationEmailDto): Promise<void> {
    this.channel.publish(
      EXCHANGE_NAME,
      QUEUE_CONFIG.CONFIRMATION_EMAIL.routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true },
    );
  }

  async enqueueReleaseNotification(data: ReleaseNotificationDto): Promise<void> {
    this.channel.publish(
      EXCHANGE_NAME,
      QUEUE_CONFIG.RELEASE_NOTIFICATION.routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true },
    );
  }
}

