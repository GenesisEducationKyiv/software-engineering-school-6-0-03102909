import { Cron } from 'croner';
import type { ScannerService } from '../services/scanner.service.js';
import type { Logger } from '@github-release-notification/shared';

export function registerScannerJob(
  cronExpression: string,
  scannerService: ScannerService,
  logger: Logger,
): Cron {
  const log = logger.child({ module: 'scanner-job' });

  const job = new Cron(cronExpression, async () => {
    log.debug('scanner job triggered from schedule');
    try {
      await scannerService.scanAllRepositories();
      log.debug('scanner job completed');
    } catch (err) {
      log.error({ err }, 'scanner job failed');
    }
  });

  log.info({ cron: cronExpression }, 'scanner job scheduled');
  return job;
}
