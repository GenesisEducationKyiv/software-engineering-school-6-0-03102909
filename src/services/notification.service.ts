import type { ISubscriptionRepository } from '../interfaces/repository.interfaces.js';
import type { IJobQueue } from '../interfaces/infrastructure.interfaces.js';

export class NotificationService {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly jobQueue: IJobQueue,
  ) {}

  async notifySubscribers(repoId: string, repoFullName: string, tag: string): Promise<void> {
    const subscribers = await this.subscriptionRepo.findConfirmedSubscribersByRepo(repoId);

    for (const sub of subscribers) {
      try {
        await this.jobQueue.enqueueReleaseNotification(
          sub.subscriber.email,
          repoFullName,
          tag,
          sub.unsubscribeToken,
        );
      } catch (err) {
        console.error(
          `notification failed to enqueue for ${sub.subscriber.email} about ${repoFullName}:`,
          err,
        );
      }
    }
  }
}
