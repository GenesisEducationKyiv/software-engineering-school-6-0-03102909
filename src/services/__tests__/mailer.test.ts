import { describe, it, expect, vi, beforeEach } from 'vitest';
import nodemailer from 'nodemailer';

vi.mock('nodemailer');
vi.mock('../../config/env.js', () => ({
  default: {
    SMTP_USER: 'test@gmail.com',
    SMTP_PASS: 'password',
    SMTP_FROM: 'Test Bot <test@gmail.com>',
    APP_URL: 'http://localhost:3000',
  },
}));

import { initMailer, sendConfirmationEmail, sendReleaseNotification } from '../mailer.service.js';

describe('MailerService', () => {
  let sendMailMock: any;
  let verifyMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    sendMailMock = vi.fn().mockResolvedValue(true);
    verifyMock = vi.fn().mockResolvedValue(true);

    (nodemailer.createTransport as any).mockReturnValue({
      sendMail: sendMailMock,
      verify: verifyMock,
    });
  });

  it('should successfully initialize the mailer transporter', async () => {
    await initMailer();

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { user: 'test@gmail.com', pass: 'password' },
      }),
    );
    expect(verifyMock).toHaveBeenCalledTimes(1);
  });

  it('should send a confirmation email with the correct confirmation link', async () => {
    await initMailer();

    await sendConfirmationEmail('user@test.com', 'owner/repo', 'fake-token');

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        subject: 'Confirm your subscription to owner/repo',
        html: expect.stringContaining('http://localhost:3000/api/confirm/fake-token'),
      }),
    );
  });

  it('should send a release notification email with the correct release and unsubscribe links', async () => {
    await initMailer();

    await sendReleaseNotification('user@test.com', 'owner/repo', 'v1.0.0', 'unsub-token');

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        subject: 'New release of owner/repo: v1.0.0',
        html: expect.stringContaining('https://github.com/owner/repo/releases/tag/v1.0.0'),
      }),
    );
  });
});
