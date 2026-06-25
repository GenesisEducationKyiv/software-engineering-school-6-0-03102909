import express from 'express';
import { logger } from './container.js';
import verifyEmailRoutes from './api/verify-email.routes.js';
import { createErrorHandler, unknownEndpoint } from './api/error-handler.middleware.js';

const app = express();

app.use(express.json());

app.use('/api', verifyEmailRoutes);

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

app.use(unknownEndpoint);
app.use(createErrorHandler(logger));

export default app;
