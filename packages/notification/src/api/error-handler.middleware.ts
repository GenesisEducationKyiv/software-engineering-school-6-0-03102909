import type { Request, Response, NextFunction } from 'express';
import type { Logger } from '../config/logger.js';

export function createErrorHandler(logger: Logger) {
  const log = logger.child({ component: 'error-handler' });

  return (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    log.error({ err }, 'unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  };
}

export const unknownEndpoint = (_req: Request, res: Response): void => {
  res.status(404).json({ error: 'Unknown endpoint' });
};
