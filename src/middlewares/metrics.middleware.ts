import type { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration } from '../metrics.js';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const route = req.route?.path ?? req.path;
    const labels = { method: req.method, route, status: res.statusCode.toString() };
    httpRequestsTotal.inc(labels);
    end(labels);
  });

  next();
}
