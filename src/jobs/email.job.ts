import type { PgBoss } from 'pg-boss';
import type { MailerService } from '../services/mailer.service.js';
import { QUEUE_NAME, type EmailPayload } from './email.queue.js';

export async function registerEmailJob(boss: PgBoss, mailer: MailerService): Promise<void> {
  await boss.createQueue(QUEUE_NAME);

  await boss.work<EmailPayload>(QUEUE_NAME, async (jobs) => {
    for (const job of jobs) {
      await mailer.processPayload(job.data);
    }
  });

  console.log('email job worker registered');
}
