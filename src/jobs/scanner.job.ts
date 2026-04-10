import boss from './boss.js';
import config from '../config/env.js';
import { scannerService } from '../services/scanner.service.js';

const QUEUE_NAME = 'release-scanner';

export async function registerScannerJob(): Promise<void> {
  await boss.createQueue(QUEUE_NAME);

  await boss.schedule(QUEUE_NAME, config.SCAN_CRON, {});

  await boss.work(QUEUE_NAME, async () => {
    console.log('scanner starting scan…');
    await scannerService.scanAllRepositories();
    console.log('scanner scan complete');
  });

  console.log(`scanner scheduled "${QUEUE_NAME}" with cron: ${config.SCAN_CRON}`);
}
