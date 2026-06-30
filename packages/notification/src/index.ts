import { Resend } from 'resend';
import config from './config/env.js';
import { MailerService } from './services/mailer.service.js';
import { startWorker } from './worker.js';
import { disconnectRabbitMQ } from './messaging/rabbitmq.js';
import app from './app.js';
import { logger } from './container.js';
import { startGrpcServer } from './grpc/grpc-server.js';

import { emailVerificationService } from './container.js';

import type { Server } from '@grpc/grpc-js';

const log = logger.child({ module: 'startup' });

const resend = new Resend(config.RESEND_API_KEY);
export const mailer = new MailerService(resend, logger);

const server = app.listen(config.NOTIFICATION_PORT, () => {
  log.info({ port: config.NOTIFICATION_PORT }, 'notification HTTP server started');
});

let grpcServer: Server | undefined;
try {
  grpcServer = await startGrpcServer(config.GRPC_HOST, config.GRPC_PORT, emailVerificationService, logger);
} catch (err) {
  log.fatal({ err }, 'failed to start gRPC server');
  process.exit(1);
}

try {
  await startWorker(config.RABBITMQ_URL, config.RABBITMQ_PREFETCH, mailer, logger);
} catch (err) {
  log.fatal({ err }, 'failed to start worker');
  process.exit(1);
}

const shutdown = async () => {
  log.info('shutting down');
  server.close();
  if (grpcServer) grpcServer.forceShutdown();
  await disconnectRabbitMQ(logger);
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
