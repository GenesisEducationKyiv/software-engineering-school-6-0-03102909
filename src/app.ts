import express from 'express';
import { errorHandler } from './middlewares/errorHandler.js';
import subscriptionRoutes from './api/routes/subscription.routes.js';

const app = express();

app.use(express.json());

app.use('/api', subscriptionRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

export default app;
