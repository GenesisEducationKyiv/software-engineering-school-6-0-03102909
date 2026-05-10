import type { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../../container.js';

export const subscribeController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, repo } = req.body;

    await subscriptionService.subscribe(email, repo);

    res.status(200).json({
      message: 'Subscription created. Check your email for confirmation.',
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const confirmController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.params.token as string;
    await subscriptionService.confirmSubscription(token);

    res.status(200).json({
      message: 'Subscription confirmed successfully',
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const unsubscribeController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.params.token as string;
    await subscriptionService.unsubscribe(token);

    res.status(200).json({ message: 'Unsubscribed successfully' });
  } catch (error: unknown) {
    next(error);
  }
};

export const getSubscriptionsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const email = req.query['email'] as string;
    const subscriptions = await subscriptionService.getSubscriptions(email);

    res.status(200).json(subscriptions);
  } catch (error: unknown) {
    next(error);
  }
};
