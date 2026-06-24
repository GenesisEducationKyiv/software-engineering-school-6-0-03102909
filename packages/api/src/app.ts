import express from 'express';
import { errorHandler, unknownEndpoint } from './shared/middlewares/error-handler.middleware.js';
import { subscriptionRoutes } from './modules/subscription/index.js';
import { registry } from './metrics.js';
import { metricsMiddleware } from './shared/middlewares/metrics.middleware.js';
import path from 'path';
import { setupSwagger } from './config/swagger.js';
import { pinoHttp } from 'pino-http';
import { logger } from './di/logger.js';

const app = express();

app.use(express.static(path.join(process.cwd(), 'public')));

app.use(express.json());
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req: import('http').IncomingMessage) => req.url === '/metrics',
    },
  }),
);
app.use(metricsMiddleware);

setupSwagger(app);

app.use('/api', subscriptionRoutes);

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType);
  res.send(await registry.metrics());
});

app.use(unknownEndpoint);
app.use(errorHandler);

export default app;
