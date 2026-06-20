import type { Request, Response } from 'express';
import { subscriptionService } from '../../../container.js';

export const subscribeController = async (req: Request, res: Response): Promise<void> => {
  const { email, repo } = req.body;

  await subscriptionService.subscribe(email, repo);

  res.status(202).json({
    message: "Subscription created. Check your email for confirmation. Didn't receive it? Please try again.",
  });
};

export const confirmController = async (req: Request, res: Response): Promise<void> => {
  const token = req.params.token as string;
  await subscriptionService.confirmSubscription(token);

  res.status(200).json({
    message: 'Subscription confirmed successfully',
  });
};

export const unsubscribeController = async (req: Request, res: Response): Promise<void> => {
  const token = req.params.token as string;
  await subscriptionService.unsubscribe(token);

  res.status(200).json({ message: 'Unsubscribed successfully' });
};

export const getSubscriptionsController = async (req: Request, res: Response): Promise<void> => {
  const email = req.query['email'] as string;
  const subscriptions = await subscriptionService.getSubscriptions(email);

  res.status(200).json(subscriptions);
};
