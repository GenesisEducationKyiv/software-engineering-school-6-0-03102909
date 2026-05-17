import type { ISubscriptionRepository } from '../interfaces/repository.interfaces.js';
import type { IGithubClient, IConfirmationEmailQueue } from '../interfaces/infrastructure.interfaces.js';
import { HttpError } from '../errors/HttpError.js';

export class SubscriptionService {
  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly githubClient: IGithubClient,
    private readonly jobQueue: IConfirmationEmailQueue,
  ) {}

  async subscribe(email: string, repo: string) {
    const [owner, name] = repo.split('/') as [string, string];

    await this.githubClient.validateRepository(owner, name);

    const latestTag = await this.githubClient.getLatestRelease(owner, name).catch(() => null);

    const { subscription, created } = await this.subscriptionRepo.createOrGet(
      email,
      owner,
      name,
      latestTag,
    );

    if (!created && subscription.isConfirmed) {
      throw new HttpError('Email is already subscribed to this repository', 409);
    }

    await this.jobQueue.enqueueConfirmationEmail({ to: email, repo, confirmToken: subscription.confirmToken });

    return subscription;
  }

  async confirmSubscription(token: string) {
    const subscription = await this.subscriptionRepo.confirmToken(token);

    if (!subscription) {
      throw new HttpError('Token not found', 404);
    }

    return subscription;
  }

  async unsubscribe(token: string) {
    const success = await this.subscriptionRepo.removeByUnsubscribeToken(token);

    if (!success) {
      throw new HttpError('Token not found', 404);
    }
  }

  async getSubscriptions(email: string) {
    const subscriptions = await this.subscriptionRepo.findByEmail(email);

    return subscriptions.map((sub) => ({
      email: sub.subscriber.email,
      repo: `${sub.repository.owner}/${sub.repository.name}`,
      confirmed: sub.isConfirmed,
      last_seen_tag: sub.repository.lastSeenTag ?? '',
    }));
  }
}
