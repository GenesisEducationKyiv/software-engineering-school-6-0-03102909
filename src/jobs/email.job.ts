import type { PgBoss } from 'pg-boss';
import type { MailerService } from '../services/mailer.service.js';
import { QUEUE_NAME } from './email.queue.js';
import type { ConfirmationEmailDto } from '../interfaces/infrastructure.interfaces.js';

export async function registerEmailJob(boss: PgBoss, mailer: MailerService): Promise<void> {
  await boss.createQueue(QUEUE_NAME);

  await boss.work<ConfirmationEmailDto>(QUEUE_NAME, async (jobs) => {
    for (const job of jobs) {
      await mailer.sendConfirmationEmail(job.data.to, job.data.repo, job.data.confirmToken);
    }
  });

  console.log('email job worker registered');
}
