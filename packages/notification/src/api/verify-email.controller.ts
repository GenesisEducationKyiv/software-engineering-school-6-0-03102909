import type { Request, Response } from 'express';
import { emailVerificationService } from '../container.js';

export const verifyEmailController = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ valid: false, reason: 'Missing "email" field' });
    return;
  }

  const result = await emailVerificationService.verifyEmail(email);
  res.status(200).json(result);
};
