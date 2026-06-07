import 'dotenv/config';
import app from './app.js';
import prisma from './db/prisma.js';
import config from './config/env.js';
import { startBoss, stopBoss } from './db/boss.js';
import { registerScannerJob } from './modules/scanner/jobs/scanner.job.js';
import { registerEmailJob } from './modules/notification/jobs/email.job.js';
import { connectRedis, disconnectRedis } from './db/redis.js';
import { boss, mailerService, scannerService } from './container.js';
import { logger } from './di/infrastructure.js';

const log = logger.child({ module: 'startup' });

await prisma.$connect();
log.info('database connected');

await connectRedis();

await startBoss();
await registerScannerJob(boss, scannerService, logger);
await registerEmailJob(boss, mailerService, logger);

const server = app.listen(config.PORT, () => {
  log.info({ port: config.PORT }, 'server running');
});

const shutdown = async () => {
  log.info('shutting down');
  server.close();
  await stopBoss();
  await disconnectRedis();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
