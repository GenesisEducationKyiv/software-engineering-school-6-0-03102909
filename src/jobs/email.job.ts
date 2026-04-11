import boss from './boss.js';
import { sendConfirmationEmail, sendReleaseNotification } from '../services/mailer.service.js';

const QUEUE_NAME = 'send-email';

interface ConfirmationPayload {
  type: 'confirmation';
  to: string;
  repo: string;
  confirmToken: string;
}

interface ReleasePayload {
  type: 'release';
  to: string;
  repo: string;
  tag: string;
  unsubscribeToken: string;
}

type EmailPayload = ConfirmationPayload | ReleasePayload;

export async function registerEmailJob(): Promise<void> {
  await boss.createQueue(QUEUE_NAME);

  await boss.work<EmailPayload>(QUEUE_NAME, async (jobs) => {
    for (const job of jobs) {
      if (job.data.type === 'confirmation') {
        await sendConfirmationEmail(job.data.to, job.data.repo, job.data.confirmToken);
      } else {
        await sendReleaseNotification(job.data.to, job.data.repo, job.data.tag, job.data.unsubscribeToken);
      }
    }
  });

  console.log('email job worker registered');
}

export async function enqueueConfirmationEmail(
  to: string,
  repo: string,
  confirmToken: string,
): Promise<void> {
  await boss.send(QUEUE_NAME, { type: 'confirmation', to, repo, confirmToken }, { retryLimit: 3, retryDelay: 30 });
}

export async function enqueueReleaseNotification(
  to: string,
  repo: string,
  tag: string,
  unsubscribeToken: string,
): Promise<void> {
  await boss.send(QUEUE_NAME, { type: 'release', to, repo, tag, unsubscribeToken }, { retryLimit: 3, retryDelay: 30 });
}
