import { Resend } from 'resend';
import type { IMailTransport } from '../interfaces/infrastructure.interfaces.js';

export class ResendMailTransport implements IMailTransport {
  constructor(private readonly resend: Resend) {}

  async sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
    await this.resend.emails.send({
      from: 'GitHub Notifier <noreply@githubnotifier.tech>',
      to,
      subject,
      html,
      text,
    });
  }
}
