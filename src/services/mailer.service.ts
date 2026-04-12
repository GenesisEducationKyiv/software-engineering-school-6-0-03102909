import { Resend } from 'resend';
import config from '../config/env.js';

const resend = new Resend(config.RESEND_API_KEY);

export async function initMailer(): Promise<void> {
  console.log('mailer connected via Resend');
}

async function sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
  await resend.emails.send({
    from: 'GitHub Notifier <noreply@githubnotifier.tech>',
    to,
    subject,
    html,
    text,
  });
}

export async function sendConfirmationEmail(
  to: string,
  repo: string,
  confirmToken: string,
): Promise<void> {
  const confirmUrl = `${config.APP_URL}/api/confirm/${confirmToken}`;

  await sendMail(
    to,
    `Confirm your subscription to ${repo}`,
    `
      <h2>Confirm your subscription</h2>
      <p>You have been subscribed to release notifications for <strong>${repo}</strong>.</p>
      <p>Please confirm your subscription by clicking the link below:</p>
      <p><a href="${confirmUrl}">Confirm subscription</a></p>
      <p style="color:#888;font-size:12px;">If you did not request this, you can safely ignore this email.</p>
    `,
    [
      `You have been subscribed to release notifications for ${repo}.`,
      '',
      'Please confirm your subscription by visiting the link below:',
      confirmUrl,
      '',
      'If you did not request this, you can safely ignore this email.',
    ].join('\n'),
  );

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

  await sendMail(
    to,
    `New release of ${repo}: ${tag}`,
    `
      <h2>New release: ${repo} ${tag}</h2>
      <p>A new release has been published for <strong>${repo}</strong>.</p>
      <p><a href="${releaseUrl}">View release ${tag} on GitHub</a></p>
      <hr/>
      <p style="color:#888;font-size:12px;">
        <a href="${unsubscribeUrl}">Unsubscribe</a> from notifications for ${repo}.
      </p>
    `,
    [
      `A new release has been published for ${repo}: ${tag}`,
      '',
      `View the release: ${releaseUrl}`,
      '',
      `Unsubscribe: ${unsubscribeUrl}`,
    ].join('\n'),
  );

  console.log(`mailer release notification sent to ${to} for ${repo}@${tag}`);
}
