import type { IRepositoryRepository, ISubscriptionRepository } from '../interfaces/repository.interfaces.js';
import type { IGithubClient, IJobQueue } from '../interfaces/infrastructure.interfaces.js';
import { GithubApiError } from './github.service.js';

export class ScannerService {
  constructor(
    private readonly repositoryRepo: IRepositoryRepository,
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly githubClient: IGithubClient,
    private readonly jobQueue: IJobQueue,
  ) {}

  async scanAllRepositories(): Promise<void> {
    const repositories = await this.repositoryRepo.findAllWithConfirmedSubscriptions();

    console.log(`scanner found ${repositories.length} repositories to check`);

    for (const repo of repositories) {
      try {
        const latestTag = await this.githubClient.getLatestRelease(repo.owner, repo.name);

        if (!latestTag) {
          console.log(`scanner ${repo.owner}/${repo.name}: no releases found`);
          continue;
        }

        if (latestTag === repo.lastSeenTag) {
          continue;
        }

        console.log(
          `scanner ${repo.owner}/${repo.name}: new release ${latestTag} (was: ${repo.lastSeenTag ?? 'none'})`,
        );

        const subscribers = await this.subscriptionRepo.findConfirmedSubscribersByRepo(repo.id);

        for (const sub of subscribers) {
          try {
            await this.jobQueue.enqueueReleaseNotification(
              sub.subscriber.email,
              `${repo.owner}/${repo.name}`,
              latestTag,
              sub.unsubscribeToken,
            );
          } catch (notifyErr) {
            console.error(
              `scanner failed to enqueue notification for ${sub.subscriber.email} about ${repo.owner}/${repo.name}:`,
              notifyErr,
            );
          }
        }

        await this.repositoryRepo.updateLastSeenTag(repo.id, latestTag);
      } catch (err) {
        if (err instanceof GithubApiError && err.status === 503) {
          console.warn(
            `scanner rate-limited while checking ${repo.owner}/${repo.name}, skipping remaining`,
          );
          break;
        }
        console.error(`scanner error scanning ${repo.owner}/${repo.name}:`, err);
      }
    }
  }
}
