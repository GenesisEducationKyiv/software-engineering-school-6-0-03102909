import 'dotenv/config';
import app from './app.js';
import prisma from './db/prisma.js';
import config from './config/env.js';

await prisma.$connect();
console.log('DB connected');

const server = app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});

const shutdown = async () => {
  console.log('Shutting down…');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
