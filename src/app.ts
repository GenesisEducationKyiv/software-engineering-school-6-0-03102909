import express from 'express';
import { errorHandler, unknownEndpoint } from './middlewares/errorHandler.js';
import subscriptionRoutes from './api/routes/subscription.routes.js';
import { registry } from './metrics.js';
import { metricsMiddleware } from './middlewares/metrics.middleware.js';
import path from 'path';
import { setupSwagger } from './docs/swagger.js';
import pinoHttpLib from 'pino-http';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pinoHttp = pinoHttpLib as any;
import { logger } from './di/infrastructure.js';

const app = express();

app.use(express.static(path.join(process.cwd(), 'public')));

app.use(express.json());
app.use(
  pinoHttp({
    logger: logger as unknown as import('pino').Logger,
    autoLogging: {
      ignore: (req: import('http').IncomingMessage) => req.url === '/metrics',
    },
  })
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
