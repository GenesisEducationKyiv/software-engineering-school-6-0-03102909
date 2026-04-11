import express from 'express';
import { errorHandler } from './middlewares/errorHandler.js';
import subscriptionRoutes from './api/routes/subscription.routes.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', subscriptionRoutes);

app.use(errorHandler);

export default app;
