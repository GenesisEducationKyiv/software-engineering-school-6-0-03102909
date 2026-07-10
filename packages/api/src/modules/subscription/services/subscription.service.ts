import type { ISubscriptionRepository } from '../interfaces.js';
import type { IGithubClient } from '../../../shared/github/index.js';
import type { IConfirmationEmailQueue } from '../../../shared/queue.js';
import type { Logger } from '@github-release-notification/shared';
import { HttpError } from '../../../shared/errors/HttpError.js';

export class SubscriptionService {
  private readonly log: Logger;

  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly githubClient: IGithubClient,
    private readonly jobQueue: IConfirmationEmailQueue,
    logger: Logger,
  ) {
    this.log = logger.child({ service: 'SubscriptionService' });
  }

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
      this.log.warn({ email, repo }, 'attempted to subscribe but already confirmed');
      throw new HttpError('Email is already subscribed to this repository', 409);
    }

    await this.jobQueue.enqueueConfirmationEmail({
      to: email,
      repo,
      confirmToken: subscription.confirmToken,
    });

    this.log.info({ repo, isNew: created }, 'subscription initiated, confirmation email queued');

    return subscription;
  }

  async confirmSubscription(token: string) {
    const subscription = await this.subscriptionRepo.confirmToken(token);

    if (!subscription) {
      this.log.warn({ token }, 'failed confirmation attempt: token not found');
      throw new HttpError('Token not found', 404);
    }

    this.log.info({ subscriptionId: subscription.id }, 'subscription confirmed successfully');

    return subscription;
  }

  async unsubscribe(token: string) {
    const success = await this.subscriptionRepo.removeByUnsubscribeToken(token);

    if (!success) {
      this.log.warn({ token }, 'failed unsubscribe attempt: token not found');
      throw new HttpError('Token not found', 404);
    }

    this.log.info({ token }, 'unsubscribed successfully');
  }

  async getSubscriptions(email: string) {
    const subscriptions = await this.subscriptionRepo.findByEmail(email);

    this.log.debug({ email, count: subscriptions.length }, 'fetched user subscriptions');

    return subscriptions.map((sub) => ({
      email: sub.subscriber.email,
      repo: `${sub.repository.owner}/${sub.repository.name}`,
      confirmed: sub.isConfirmed,
      last_seen_tag: sub.repository.lastSeenTag ?? '',
    }));
  }
}
