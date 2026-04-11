import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { validateRepository } from './github.service.js';
import { sendConfirmationEmail } from './mailer.service.js';
import { HttpError } from '../errors/HttpError.js';

export async function subscribe(email: string, repo: string) {
  const [owner, name] = repo.split('/') as [string, string];

  await validateRepository(owner, name);

  const { subscription, created } = await subscriptionRepository.createOrGet(email, owner, name);

  if (!created) {
    throw new HttpError('Email is already subscribed to this repository', 409);
  }

  await sendConfirmationEmail(email, repo, subscription.confirmToken);

  return subscription;
}

export async function confirmSubscription(token: string) {
  const subscription = await subscriptionRepository.confirmToken(token);

  if (!subscription) {
    throw new HttpError('Token not found', 404);
  }

  return subscription;
}

export async function unsubscribe(token: string) {
  const success = await subscriptionRepository.removeByUnsubscribeToken(token);

  if (!success) {
    throw new HttpError('Token not found', 404);
  }
}

export async function getSubscriptions(email: string) {
  const subscriptions = await subscriptionRepository.findByEmail(email);

  return subscriptions.map((sub) => ({
    email: sub.subscriber.email,
    repo: `${sub.repository.owner}/${sub.repository.name}`,
    confirmed: sub.isConfirmed,
    last_seen_tag: sub.repository.lastSeenTag ?? '',
  }));
}
