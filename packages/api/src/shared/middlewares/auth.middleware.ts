import type { Request, Response, NextFunction } from 'express';
import config from '../../config/env.js';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!config.API_KEY) {
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== config.API_KEY) {
    res.status(401).json({ error: 'Unauthorized: invalid or missing API key' });
    return;
  }

  next();
};
