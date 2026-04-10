import type { Request, Response, NextFunction } from 'express';
import { subscribe, confirmSubscription } from '../../services/subscription.service.js';
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
