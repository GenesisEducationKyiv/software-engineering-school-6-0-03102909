import 'dotenv/config';
import app from './app.js';
import prisma from './db/prisma.js';
import config from './config/env.js';
import { startBoss, stopBoss } from './jobs/boss.js';
import { registerScannerJob } from './jobs/scanner.job.js';
import { initMailer } from './services/mailer.service.js';

await prisma.$connect();
console.log('DB connected');

await initMailer();

await startBoss();
await registerScannerJob();

const server = app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});

const shutdown = async () => {
  console.log('Shutting down…');
  server.close();
  await stopBoss();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
