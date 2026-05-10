import type { PgBoss } from 'pg-boss';
import type { MailerService } from '../services/mailer.service.js';
import type { EmailPayload } from './email.queue.js';

const QUEUE_NAME = 'send-email';

export async function registerEmailJob(boss: PgBoss, mailer: MailerService): Promise<void> {
  await boss.createQueue(QUEUE_NAME);

  await boss.work<EmailPayload>(QUEUE_NAME, async (jobs) => {
    for (const job of jobs) {
      if (job.data.type === 'confirmation') {
        await mailer.sendConfirmationEmail(job.data.to, job.data.repo, job.data.confirmToken);
      } else {
        await mailer.sendReleaseNotification(job.data.to, job.data.repo, job.data.tag, job.data.unsubscribeToken);
      }
    }
  });

  console.log('email job worker registered');
}
