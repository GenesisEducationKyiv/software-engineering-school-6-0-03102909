import type { IMailTransport } from '../interfaces/infrastructure.interfaces.js';
import { confirmationTemplate, releaseNotificationTemplate } from './email.templates.js';

export class MailerService {
  constructor(private readonly transport: IMailTransport) {}

  async sendConfirmationEmail(to: string, repo: string, confirmToken: string): Promise<void> {
    const { subject, html, text } = confirmationTemplate(repo, confirmToken);
    await this.transport.sendMail(to, subject, html, text);
    console.log(`mailer confirmation email sent to ${to} for ${repo}`);
  }

  async sendReleaseNotification(
    to: string,
    repo: string,
    tag: string,
    unsubscribeToken: string,
  ): Promise<void> {
    const { subject, html, text } = releaseNotificationTemplate(repo, tag, unsubscribeToken);
    await this.transport.sendMail(to, subject, html, text);
    console.log(`mailer release notification sent to ${to} for ${repo}@${tag}`);
  }
}
