import type { Request, Response } from 'express';
import { mailer } from '../index.js';

export const sendConfirmationController = async (req: Request, res: Response): Promise<void> => {
  const { to, repo, confirmToken } = req.body;

  if (!to || !repo || !confirmToken) {
    res.status(400).json({ error: 'Missing required fields: to, repo, confirmToken' });
    return;
  }

  await mailer.sendConfirmationEmail(to, repo, confirmToken);
  res.json({ status: 'sent' });
};

export const sendReleaseController = async (req: Request, res: Response): Promise<void> => {
  const { to, repo, tag, unsubscribeToken } = req.body;

  if (!to || !repo || !tag || !unsubscribeToken) {
    res.status(400).json({ error: 'Missing required fields: to, repo, tag, unsubscribeToken' });
    return;
  }

  await mailer.sendReleaseNotification(to, repo, tag, unsubscribeToken);
  res.json({ status: 'sent' });
};

export const healthController = (_req: Request, res: Response): void => {
  res.json({ status: 'ok' });
};
