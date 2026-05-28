import type { Resend } from 'resend';
import type { EmailPayload } from '../jobs/email.queue.js';
import { confirmationTemplate, releaseNotificationTemplate } from './email.templates.js';

export class MailerService {
  constructor(private readonly resend: Resend) {}

  private async sendMail(to: string, subject: string, html?: string, text?: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: 'GitHub Notifier <noreply@githubnotifier.tech>',
      to,
      subject,
      html: html ?? '',
      text: text ?? '',
    });
    if (error) {
      throw new Error(`Resend API Error: ${error.message}`);
    }
  }

  async processPayload(data: EmailPayload): Promise<void> {
    switch (data.type) {
      case 'confirmation':
        return this.sendConfirmationEmail(data.to, data.repo, data.confirmToken);
      case 'release':
        return this.sendReleaseNotification(data.to, data.repo, data.tag, data.unsubscribeToken);
      default:
        console.error(`mailer unknown email type: ${(data as EmailPayload).type}`);
    }
  }

  async sendConfirmationEmail(to: string, repo: string, confirmToken: string): Promise<void> {
    const { subject, html, text } = confirmationTemplate(repo, confirmToken);
    await this.sendMail(to, subject, html, text);
    console.log(`mailer confirmation email sent to ${to} for ${repo}`);
  }

  async sendReleaseNotification(
    to: string,
    repo: string,
    tag: string,
    unsubscribeToken: string,
  ): Promise<void> {
    const { subject, html, text } = releaseNotificationTemplate(repo, tag, unsubscribeToken);
    await this.sendMail(to, subject, html, text);
    console.log(`mailer release notification sent to ${to} for ${repo}@${tag}`);
  }
}
