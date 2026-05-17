import type { ISubscriptionRepository } from '../interfaces/repository.interfaces.js';
import type { IReleaseNotificationQueue } from '../interfaces/infrastructure.interfaces.js';

export class NotificationService {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly jobQueue: IReleaseNotificationQueue,
  ) {}

  async notifySubscribers(repoId: string, repoFullName: string, tag: string): Promise<void> {
    const subscribers = await this.subscriptionRepo.findConfirmedSubscribersByRepo(repoId);

    for (const sub of subscribers) {
      try {
        await this.jobQueue.enqueueReleaseNotification({
          to: sub.subscriber.email,
          repo: repoFullName,
          tag,
          unsubscribeToken: sub.unsubscribeToken,
        });
      } catch (err) {
        console.error(
          `notification failed to enqueue for ${sub.subscriber.email} about ${repoFullName}:`,
          err,
        );
      }
    }
  }
}
