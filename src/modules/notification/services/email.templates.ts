import config from '../../../config/env.js';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function confirmationTemplate(repo: string, confirmToken: string): EmailTemplate {
  const confirmUrl = `${config.APP_URL}/api/confirm/${confirmToken}`;

  return {
    subject: `Confirm your subscription to ${repo}`,
    html: `
      <h2>Confirm your subscription</h2>
      <p>You have been subscribed to release notifications for <strong>${repo}</strong>.</p>
      <p>Please confirm your subscription by clicking the link below:</p>
      <p><a href="${confirmUrl}">Confirm subscription</a></p>
      <p style="color:#888;font-size:12px;">If you did not request this, you can safely ignore this email.</p>
    `,
    text: [
      `You have been subscribed to release notifications for ${repo}.`,
      '',
      'Please confirm your subscription by visiting the link below:',
      confirmUrl,
      '',
      'If you did not request this, you can safely ignore this email.',
    ].join('\n'),
  };
}

export function releaseNotificationTemplate(
  repo: string,
  tag: string,
  unsubscribeToken: string,
): EmailTemplate {
  const releaseUrl = `https://github.com/${repo}/releases/tag/${tag}`;
  const unsubscribeUrl = `${config.APP_URL}/api/unsubscribe/${unsubscribeToken}`;

  return {
    subject: `New release of ${repo}: ${tag}`,
    html: `
      <h2>New release: ${repo} ${tag}</h2>
      <p>A new release has been published for <strong>${repo}</strong>.</p>
      <p><a href="${releaseUrl}">View release ${tag} on GitHub</a></p>
      <hr/>
      <p style="color:#888;font-size:12px;">
        <a href="${unsubscribeUrl}">Unsubscribe</a> from notifications for ${repo}.
      </p>
    `,
    text: [
      `A new release has been published for ${repo}: ${tag}`,
      '',
      `View the release: ${releaseUrl}`,
      '',
      `Unsubscribe: ${unsubscribeUrl}`,
    ].join('\n'),
  };
}
