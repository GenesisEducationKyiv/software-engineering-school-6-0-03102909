import express, { type Request, type Response, type NextFunction } from 'express';
import notificationRoutes from './routes/notification.routes.js';
import type { Logger } from './config/logger.js';

export function createApp(logger: Logger) {
  const app = express();
  app.use(express.json());
  app.use('/', notificationRoutes);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'unhandled error');
    res.status(500).json({ error: err.message });
  });

  return app;
}
