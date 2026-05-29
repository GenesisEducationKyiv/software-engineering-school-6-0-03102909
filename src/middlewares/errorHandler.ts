import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors/HttpError.js';
import { AppError } from '../errors/AppError.js';
import { GithubNotFoundError, GithubRateLimitError } from '../services/github.service.js';
import { logger } from '../di/infrastructure.js';

const log = logger.child({ module: 'http' });

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof GithubNotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  if (err instanceof GithubRateLimitError) {
    res.status(503).json({ error: err.message });
    return;
  }
  if (err instanceof AppError) {
    res.status(400).json({ error: err.message });
    return;
  }
  
  log.error({ err }, 'Unhandled internal server error');
  res.status(500).json({ error: 'Internal server error' });
};

export const unknownEndpoint = (_req: Request, res: Response): void => {
  res.status(404).json({ error: 'Unknown endpoint' });
};
