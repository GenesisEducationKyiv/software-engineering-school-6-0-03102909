import { PgBoss } from 'pg-boss';
import config from '../config/env.js';

const boss = new PgBoss(config.DATABASE_URL);

boss.on('error', (err: Error) => {
  console.error('pg-boss error:', err);
});

export async function startBoss(): Promise<void> {
  await boss.start();
  console.log('pg-boss started');
}

export async function stopBoss(): Promise<void> {
  await boss.stop({ graceful: true });
  console.log('pg-boss stopped');
}

export default boss;
