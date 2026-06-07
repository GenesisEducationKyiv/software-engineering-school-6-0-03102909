import type { IRepositoryRepository } from '../interfaces.js';
import type { ISubscriptionRepository } from '../../subscription/index.js';
import type { IGithubClient } from '../../../shared/github/index.js';
import type { Logger } from '../../../config/logger.js';
import type { MailerService } from '../../notification/index.js';
import { GithubNotFoundError, GithubRateLimitError } from '../../../shared/github/index.js';

export class ScannerService {
  private readonly log: Logger;

  constructor(
    private readonly repositoryRepo: IRepositoryRepository,
    private readonly githubClient: IGithubClient,
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly mailerService: MailerService,
    logger: Logger,
  ) {
    this.log = logger.child({ module: 'ScannerService' });
  }

  async scanAllRepositories(): Promise<void> {
    const repositories = await this.repositoryRepo.findAllWithConfirmedSubscriptions();

    this.log.info({ count: repositories.length }, 'starting repository scan');

    for (const repo of repositories) {
      try {
        const latestTag = await this.githubClient.getLatestRelease(repo.owner, repo.name);

        if (latestTag === repo.lastSeenTag) {
          this.log.debug(
            { repo: `${repo.owner}/${repo.name}`, tag: latestTag },
            'no new release found',
          );
          continue;
        }

        this.log.info(
          { repo: `${repo.owner}/${repo.name}`, newTag: latestTag, oldTag: repo.lastSeenTag },
          'new release detected',
        );

        await this.notifySubscribers(repo.id, `${repo.owner}/${repo.name}`, latestTag);
        await this.repositoryRepo.updateLastSeenTag(repo.id, latestTag);
      } catch (err) {
        if (err instanceof GithubNotFoundError) {
          this.log.warn({ repo: `${repo.owner}/${repo.name}` }, 'no releases found for repository');
          continue;
        }
        if (err instanceof GithubRateLimitError) {
          this.log.warn('github rate limit exceeded, skipping remaining repositories');
          break;
        }
        this.log.error({ err, repo: `${repo.owner}/${repo.name}` }, 'error scanning repository');
      }
    }

    this.log.info('repository scan completed');
  }

  private async notifySubscribers(
    repoId: string,
    repoFullName: string,
    tag: string,
  ): Promise<void> {
    const subscribers = await this.subscriptionRepo.findConfirmedSubscribersByRepo(repoId);
    this.log.info(
      { repo: repoFullName, tag, subscriberCount: subscribers.length },
      'notifying subscribers about release',
    );

    let successCount = 0;
    let failCount = 0;

    for (const sub of subscribers) {
      try {
        await this.mailerService.sendReleaseNotification(
          sub.subscriber.email,
          repoFullName,
          tag,
          sub.unsubscribeToken,
        );
        successCount++;
      } catch (err) {
        failCount++;
        this.log.error(
          { err, repo: repoFullName, subscriberEmail: sub.subscriber.email },
          'failed to send release notification',
        );
      }
    }

    this.log.info(
      { repo: repoFullName, tag, successCount, failCount },
      'finished notifying subscribers',
    );
  }
}
