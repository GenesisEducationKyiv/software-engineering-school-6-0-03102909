import type { PgBoss } from 'pg-boss';
import type { MailerService } from '../services/mailer.service.js';
import type { EmailPayload } from './email.queue.js';

const QUEUE_NAME = 'send-email';

async function handleEmail(mailer: MailerService, data: EmailPayload): Promise<void> {
  switch (data.type) {
    case 'confirmation':
      return mailer.sendConfirmationEmail(data.to, data.repo, data.confirmToken);
    case 'release':
      return mailer.sendReleaseNotification(data.to, data.repo, data.tag, data.unsubscribeToken);
    default:
      console.error(`email job unknown type: ${(data as EmailPayload).type}`);
  }
}

export async function registerEmailJob(boss: PgBoss, mailer: MailerService): Promise<void> {
  await boss.createQueue(QUEUE_NAME);

  await boss.work<EmailPayload>(QUEUE_NAME, async (jobs) => {
    for (const job of jobs) {
      await handleEmail(mailer, job.data);
    }
  });

  console.log('email job worker registered');
}
