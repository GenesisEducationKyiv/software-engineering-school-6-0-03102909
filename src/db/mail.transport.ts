import { Resend } from 'resend';
import type { IMailTransport } from '../interfaces/infrastructure.interfaces.js';

export class ResendMailTransport implements IMailTransport {
  constructor(private readonly resend: Resend) {}

  async sendMail(to: string, subject: string, html?: string, text?: string): Promise<void> {
    const payload: Parameters<typeof this.resend.emails.send>[0] = {
      from: 'GitHub Notifier <noreply@githubnotifier.tech>',
      to,
      subject,
      html: html ?? '',
      text: text ?? '',
    };

    const { error } = await this.resend.emails.send(payload);
    if (error) {
      throw new Error(`Resend API Error: ${error.message}`);
    }
  }
}
