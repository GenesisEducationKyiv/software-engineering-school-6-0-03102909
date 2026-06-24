import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConfirmationEmailHandler } from '../confirmation-email.handler.js';
import type { MailerService } from '../../services/mailer.service.js';
import type { Logger } from '../../config/logger.js';
import type { ConfirmationEmailDto } from '@github-release-notification/shared';
import type { ISagaReplyPublisher } from '../../messaging/saga-publisher.js';

function createMocks() {
  const mailer = {
    sendConfirmationEmail: vi.fn(),
  } as unknown as MailerService;

  const sagaPublisher = {
    publishSuccess: vi.fn().mockResolvedValue(undefined),
    publishFailure: vi.fn().mockResolvedValue(undefined),
  } as unknown as ISagaReplyPublisher;

  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as Logger;

  return { mailer, sagaPublisher, logger };
}

describe('createConfirmationEmailHandler', () => {
  let mailer: MailerService;
  let sagaPublisher: ISagaReplyPublisher;
  let logger: Logger;
  let handler: (data: ConfirmationEmailDto) => Promise<void>;

  const dto: ConfirmationEmailDto = {
    to: 'user@example.com',
    repo: 'owner/repo',
    confirmToken: '123e4567-e89b-12d3-a456-426614174000',
  };

  beforeEach(() => {
    ({ mailer, sagaPublisher, logger } = createMocks());
    handler = createConfirmationEmailHandler(mailer, sagaPublisher, logger);
  });

  it('should send email and publish success saga reply', async () => {
    await handler(dto);

    expect(mailer.sendConfirmationEmail).toHaveBeenCalledOnce();
    expect(mailer.sendConfirmationEmail).toHaveBeenCalledWith(
      dto.to,
      dto.repo,
      dto.confirmToken,
    );

    expect(sagaPublisher.publishSuccess).toHaveBeenCalledOnce();
    expect(sagaPublisher.publishSuccess).toHaveBeenCalledWith(dto.confirmToken);
  });

  it('should publish failure saga reply when mailer fails and not throw', async () => {
    const error = new Error('send failed');
    vi.mocked(mailer.sendConfirmationEmail).mockRejectedValueOnce(error);

    await expect(handler(dto)).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      { err: error, to: dto.to },
      'failed to send confirmation email',
    );

    expect(sagaPublisher.publishFailure).toHaveBeenCalledOnce();
    expect(sagaPublisher.publishFailure).toHaveBeenCalledWith(dto.confirmToken, 'send failed');
  });
});
