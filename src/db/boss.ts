import { PgBoss } from 'pg-boss';
import config from '../config/env.js';
import { logger } from '../di/logger.js';
import { CONFIRMATION_QUEUE_NAME, RELEASE_QUEUE_NAME } from '../shared/queue.js';

const boss = new PgBoss(config.DATABASE_URL);
const log = logger.child({ module: 'pg-boss' });

boss.on('error', (err: Error) => {
  log.error({ err }, 'pg-boss encountered an error');
});

export async function startBoss(): Promise<void> {
  await boss.start();
  await boss.createQueue(CONFIRMATION_QUEUE_NAME);
  await boss.createQueue(RELEASE_QUEUE_NAME);
  log.info('pg-boss started successfully and queues created');
}

export async function stopBoss(): Promise<void> {
  await boss.stop({ graceful: true });
  log.info('pg-boss stopped gracefully');
}

export default boss;
