import { repositoryRepository } from '../repositories/repository.repository.js';
import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { getLatestRelease, GithubApiError } from './github.service.js';

export const scannerService = {
  async scanAllRepositories(): Promise<void> {
    const repositories = await repositoryRepository.findAllWithConfirmedSubscriptions();

    console.log(`scanner found ${repositories.length} repositories to check`);

    for (const repo of repositories) {
      try {
        const latestTag = await getLatestRelease(repo.owner, repo.name);

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

        const subscribers = await subscriptionRepository.findConfirmedSubscribersByRepo(repo.id);

        for (const sub of subscribers) {
          try {
            // TODO: send release notification email to sub.subscriber.email
            console.log(
              `scanner would notify ${sub.subscriber.email} about ${repo.owner}/${repo.name}@${latestTag}`,
            );
          } catch (notifyErr) {
            console.error(
              `scanner failed to notify ${sub.subscriber.email} about ${repo.owner}/${repo.name}:`,
              notifyErr,
            );
          }
        }

        await repositoryRepository.updateLastSeenTag(repo.id, latestTag);
      } catch (err) {
        if (err instanceof GithubApiError && err.status === 503) {
          console.warn(`scanner rate-limited while checking ${repo.owner}/${repo.name}, skipping remaining`);
          break;
        }
        console.error(`scanner error scanning ${repo.owner}/${repo.name}:`, err);
      }
    }
  },
};
