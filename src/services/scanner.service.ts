import type { IRepositoryRepository } from '../interfaces/repository.interfaces.js';
import type { IGithubClient } from '../interfaces/infrastructure.interfaces.js';
import type { NotificationService } from './notification.service.js';
import { GithubApiError } from './github.service.js';

export class ScannerService {
  constructor(
    private readonly repositoryRepo: IRepositoryRepository,
    private readonly githubClient: IGithubClient,
    private readonly notificationService: NotificationService,
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

        await this.notificationService.notifySubscribers(
          repo.id,
          `${repo.owner}/${repo.name}`,
          latestTag,
        );

        await this.repositoryRepo.updateLastSeenTag(repo.id, latestTag);
      } catch (err) {
        if (err instanceof GithubApiError) {
          if (err.status === 404) {
            console.log(`scanner ${repo.owner}/${repo.name}: no releases found`);
            continue;
          }
          if (err.status === 503) {
            console.warn(
              `scanner rate-limited while checking ${repo.owner}/${repo.name}, skipping remaining`,
            );
            break;
          }
        }
        console.error(`scanner error scanning ${repo.owner}/${repo.name}:`, err);
      }
    }
  }
}
