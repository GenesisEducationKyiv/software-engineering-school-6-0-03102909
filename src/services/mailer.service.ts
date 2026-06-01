import type { Resend } from 'resend';
import { confirmationTemplate, releaseNotificationTemplate } from './email.templates.js';
import { AppError } from '../errors/AppError.js';
import type { Logger } from '../config/logger.js';

export class MailerError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'MailerError';
  }
}

export class MailerService {
  private readonly log: Logger;

  constructor(private readonly resend: Resend, logger: Logger) {
    this.log = logger.child({ service: 'MailerService' });
  }

  private async sendMail(to: string, subject: string, html?: string, text?: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: 'GitHub Notifier <noreply@githubnotifier.tech>',
      to,
      subject,
      html: html ?? '',
      text: text ?? '',
    });
    if (error) {
      throw new MailerError(`Resend API Error: ${error.message}`);
    }
  }

  async sendConfirmationEmail(to: string, repo: string, confirmToken: string): Promise<void> {
    const { subject, html, text } = confirmationTemplate(repo, confirmToken);
    await this.sendMail(to, subject, html, text);
    this.log.info({ to, repo }, 'confirmation email sent');
  }

  async sendReleaseNotification(
    to: string,
    repo: string,
    tag: string,
    unsubscribeToken: string,
  ): Promise<void> {
    const { subject, html, text } = releaseNotificationTemplate(repo, tag, unsubscribeToken);
    await this.sendMail(to, subject, html, text);
    this.log.info({ to, repo, tag }, 'release notification sent');
  }
}
