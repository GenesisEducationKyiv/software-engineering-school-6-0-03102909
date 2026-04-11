import type { Request, Response, NextFunction } from 'express';
import {
  subscribe,
  confirmSubscription,
  unsubscribe,
  getSubscriptions,
} from '../../services/subscription.service.js';
import { HttpError } from '../../errors/HttpError.js';

export const subscribeController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, repo } = req.body;

    const subscription = await subscribe(email, repo);

    res.status(200).json({
      message: 'Successfully subscribed to repository',
      data: subscription,
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
    const { token } = req.params;
    if (!token || typeof token !== 'string') throw new HttpError('Invalid token', 400);
    await confirmSubscription(token);

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
    const { token } = req.params;

    if (!token || typeof token !== 'string') {
      throw new HttpError('Invalid token format', 400);
    }

    await unsubscribe(token);

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
    const subscriptions = await getSubscriptions(email);

    res.status(200).json(subscriptions);
  } catch (error: unknown) {
    next(error);
  }
};
