import type { PgBoss } from 'pg-boss';
import config from '../config/env.js';
import type { ScannerService } from '../services/scanner.service.js';

const QUEUE_NAME = 'release-scanner';

export async function registerScannerJob(boss: PgBoss, scannerService: ScannerService): Promise<void> {
  await boss.createQueue(QUEUE_NAME);

  await boss.schedule(QUEUE_NAME, config.SCAN_CRON, {});

  await boss.work(QUEUE_NAME, async () => {
    console.log('scanner starting scan…');
    await scannerService.scanAllRepositories();
    console.log('scanner scan complete');
  });

  console.log(`scanner scheduled "${QUEUE_NAME}" with cron: ${config.SCAN_CRON}`);
}
