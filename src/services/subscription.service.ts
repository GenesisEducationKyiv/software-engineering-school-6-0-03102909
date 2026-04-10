import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { validateRepository } from './github.service.js';
import { HttpError } from '../errors/HttpError.js';

export async function subscribe(email: string, repo: string) {
  const [owner, name] = repo.split('/') as [string, string];

  await validateRepository(owner, name);

  const { subscription, created } = await subscriptionRepository.createOrGet(
    email,
    owner,
    name,
  );

  if (!created) {
    throw new HttpError('Email is already subscribed to this repository', 409);
  }

  // TODO: send confirmation email using subscription.confirmToken

  return subscription;
}
