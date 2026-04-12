import nodemailer, { type Transporter, type SendMailOptions } from 'nodemailer';
import config from '../config/env.js';

let transporter: Transporter;

export async function initMailer(): Promise<void> {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 2525,
    secure: false,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });

  await transporter.verify();
  console.log(`mailer connected via Gmail as ${config.SMTP_USER}`);
}

async function sendMail(options: SendMailOptions): Promise<void> {
  await transporter.sendMail(options);
}

export async function sendConfirmationEmail(
  to: string,
  repo: string,
  confirmToken: string,
): Promise<void> {
  const confirmUrl = `${config.APP_URL}/api/confirm/${confirmToken}`;

  await sendMail({
    from: config.SMTP_FROM,
    to,
    subject: `Confirm your subscription to ${repo}`,
    text: [
      `You have been subscribed to release notifications for ${repo}.`,
      '',
      'Please confirm your subscription by visiting the link below:',
      confirmUrl,
      '',
      'If you did not request this, you can safely ignore this email.',
    ].join('\n'),
    html: `
      <h2>Confirm your subscription</h2>
      <p>You have been subscribed to release notifications for <strong>${repo}</strong>.</p>
      <p>Please confirm your subscription by clicking the link below:</p>
      <p><a href="${confirmUrl}">Confirm subscription</a></p>
      <p style="color:#888;font-size:12px;">If you did not request this, you can safely ignore this email.</p>
    `,
  });

  console.log(`mailer confirmation email sent to ${to} for ${repo}`);
}

export async function sendReleaseNotification(
  to: string,
  repo: string,
  tag: string,
  unsubscribeToken: string,
): Promise<void> {
  const releaseUrl = `https://github.com/${repo}/releases/tag/${tag}`;
  const unsubscribeUrl = `${config.APP_URL}/api/unsubscribe/${unsubscribeToken}`;

  await sendMail({
    from: config.SMTP_FROM,
    to,
    subject: `New release of ${repo}: ${tag}`,
    text: [
      `A new release has been published for ${repo}: ${tag}`,
      '',
      `View the release: ${releaseUrl}`,
      '',
      `Unsubscribe: ${unsubscribeUrl}`,
    ].join('\n'),
    html: `
      <h2>New release: ${repo} ${tag}</h2>
      <p>A new release has been published for <strong>${repo}</strong>.</p>
      <p><a href="${releaseUrl}">View release ${tag} on GitHub</a></p>
      <hr/>
      <p style="color:#888;font-size:12px;">
        <a href="${unsubscribeUrl}">Unsubscribe</a> from notifications for ${repo}.
      </p>
    `,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
    },
  });

  console.log(`mailer release notification sent to ${to} for ${repo}@${tag}`);
}
