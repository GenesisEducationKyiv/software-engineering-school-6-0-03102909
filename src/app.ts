import express from 'express';
import { errorHandler, unknownEndpoint } from './middlewares/errorHandler.js';
import subscriptionRoutes from './api/routes/subscription.routes.js';
import { registry } from './metrics.js';
import { metricsMiddleware } from './middlewares/metrics.middleware.js';
import path from 'path';
import { setupSwagger } from './docs/swagger.js';

const app = express();

app.use(express.static(path.join(process.cwd(), 'public')));

app.use(express.json());
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
