import type {
  IRepositoryRepository,
  ISubscriptionRepository,
} from '../interfaces/repository.interfaces.js';
import type { IGithubClient } from '../interfaces/infrastructure.interfaces.js';
import type { MailerService } from './mailer.service.js';
import { GithubApiError, GithubNotFoundError, GithubRateLimitError } from './github.service.js';

export class ScannerService {
  constructor(
    private readonly repositoryRepo: IRepositoryRepository,
    private readonly githubClient: IGithubClient,
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly mailerService: MailerService,
  ) {}

  async scanAllRepositories(): Promise<void> {
    const repositories = await this.repositoryRepo.findAllWithConfirmedSubscriptions();

    console.log(`scanner found ${repositories.length} repositories to check`);

    for (const repo of repositories) {
      try {
        const latestTag = await this.githubClient.getLatestRelease(repo.owner, repo.name);

        if (latestTag === repo.lastSeenTag) {
          continue;
        }

        console.log(
          `scanner ${repo.owner}/${repo.name}: new release ${latestTag} (was: ${repo.lastSeenTag ?? 'none'})`,
        );

        await this.notifySubscribers(repo.id, `${repo.owner}/${repo.name}`, latestTag);

        await this.repositoryRepo.updateLastSeenTag(repo.id, latestTag);
      } catch (err) {
        if (err instanceof GithubNotFoundError) {
          console.log(`scanner ${repo.owner}/${repo.name}: no releases found`);
          continue;
        }
        if (err instanceof GithubRateLimitError) {
          console.warn(
            `scanner rate-limited while checking ${repo.owner}/${repo.name}, skipping remaining`,
          );
          break;
        }
        console.error(`scanner error scanning ${repo.owner}/${repo.name}:`, err);
      }
    }
  }

  private async notifySubscribers(
    repoId: string,
    repoFullName: string,
    tag: string,
  ): Promise<void> {
    const subscribers = await this.subscriptionRepo.findConfirmedSubscribersByRepo(repoId);

    for (const sub of subscribers) {
      try {
        await this.mailerService.sendReleaseNotification(
          sub.subscriber.email,
          repoFullName,
          tag,
          sub.unsubscribeToken,
        );
      } catch (err) {
        console.error(
          `scanner failed to send notification to ${sub.subscriber.email} about ${repoFullName}:`,
          err,
        );
      }
    }
  }
}
