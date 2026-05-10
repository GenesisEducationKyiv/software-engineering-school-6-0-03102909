import { Resend } from 'resend';
import config from '../config/env.js';
import type { IMailTransport } from '../interfaces/infrastructure.interfaces.js';

export class ResendMailTransport implements IMailTransport {
  private readonly resend: Resend;

  constructor() {
    this.resend = new Resend(config.RESEND_API_KEY);
  }

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
