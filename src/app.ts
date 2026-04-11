import express from 'express';
import { errorHandler } from './middlewares/errorHandler.js';
import subscriptionRoutes from './api/routes/subscription.routes.js';
import { registry } from './metrics.js';
import { metricsMiddleware } from './middlewares/metrics.middleware.js';

const app = express();

app.use(express.json());
app.use(metricsMiddleware);

app.use('/api', subscriptionRoutes);

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType);
  res.send(await registry.metrics());
});

app.use(errorHandler);

export default app;
