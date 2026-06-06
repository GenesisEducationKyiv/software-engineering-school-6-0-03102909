import type { PgBoss } from 'pg-boss';
import config from '../config/env.js';
import type { ScannerService } from '../services/scanner.service.js';
import type { Logger } from '../config/logger.js';

const QUEUE_NAME = 'release-scanner';

export async function registerScannerJob(
  boss: PgBoss,
  scannerService: ScannerService,
  logger: Logger
): Promise<void> {
  const log = logger.child({ module: 'scanner-job' });
  
  await boss.createQueue(QUEUE_NAME);

  await boss.schedule(QUEUE_NAME, config.SCAN_CRON, {});

  await boss.work(QUEUE_NAME, async () => {
    log.debug('scanner job triggered from schedule');
    await scannerService.scanAllRepositories();
    log.debug('scanner job completed');
  });

  log.info({ queue: QUEUE_NAME, cron: config.SCAN_CRON }, 'scanner job scheduled');
}
