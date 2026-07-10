import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createReleaseNotificationHandler } from '../release-notification.handler.js';
import type { MailerService } from '../../services/mailer.service.js';
import type { Logger } from '../../config/logger.js';
import type { ReleaseNotificationDto } from '@github-release-notification/shared';

function createMocks() {
  const mailer = {
    sendReleaseNotification: vi.fn(),
  } as unknown as MailerService;

  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as Logger;

  return { mailer, logger };
}

describe('createReleaseNotificationHandler', () => {
  let mailer: MailerService;
  let logger: Logger;
  let handler: (data: ReleaseNotificationDto) => Promise<void>;

  const dto: ReleaseNotificationDto = {
    to: 'user@example.com',
    repo: 'facebook/react',
    tag: 'v19.0.0',
    unsubscribeToken: '123e4567-e89b-12d3-a456-426614174000',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ({ mailer, logger } = createMocks());
    handler = createReleaseNotificationHandler(mailer, logger);
  });

  it('should call mailer.sendReleaseNotification with correct arguments', async () => {
    await handler(dto);

    expect(mailer.sendReleaseNotification).toHaveBeenCalledOnce();
    expect(mailer.sendReleaseNotification).toHaveBeenCalledWith(
      dto.to,
      dto.repo,
      dto.tag,
      dto.unsubscribeToken,
    );
  });

  it('should throw and log error when mailer fails', async () => {
    const error = new Error('send failed');
    (mailer.sendReleaseNotification as any).mockRejectedValueOnce(error);

    await expect(handler(dto)).rejects.toThrow('send failed');

    expect(logger.error).toHaveBeenCalledWith(
      { err: error, to: dto.to },
      'failed to send release notification',
    );
  });
});
