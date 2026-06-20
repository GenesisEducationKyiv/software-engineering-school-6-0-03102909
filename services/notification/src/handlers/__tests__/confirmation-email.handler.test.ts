import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConfirmationEmailHandler } from '../confirmation-email.handler.js';
import type { MailerService } from '../../services/mailer.service.js';
import type { Logger } from '../../config/logger.js';
import type { ConfirmationEmailDto } from '../../dto/confirmation-email.dto.js';

function createMocks() {
  const mailer = {
    sendConfirmationEmail: vi.fn(),
  } as unknown as MailerService;

  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as Logger;

  return { mailer, logger };
}

describe('createConfirmationEmailHandler', () => {
  let mailer: MailerService;
  let logger: Logger;
  let handler: (data: ConfirmationEmailDto) => Promise<void>;

  const dto: ConfirmationEmailDto = {
    to: 'user@example.com',
    repo: 'owner/repo',
    confirmToken: 'abc-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ({ mailer, logger } = createMocks());
    handler = createConfirmationEmailHandler(mailer, logger);
  });

  it('should call mailer.sendConfirmationEmail with correct arguments', async () => {
    await handler(dto);

    expect(mailer.sendConfirmationEmail).toHaveBeenCalledOnce();
    expect(mailer.sendConfirmationEmail).toHaveBeenCalledWith(
      dto.to,
      dto.repo,
      dto.confirmToken,
    );
  });

  it('should throw and log error when mailer fails', async () => {
    const error = new Error('send failed');
    (mailer.sendConfirmationEmail as any).mockRejectedValueOnce(error);

    await expect(handler(dto)).rejects.toThrow('send failed');

    expect(logger.error).toHaveBeenCalledWith(
      { err: error, to: dto.to },
      'failed to send confirmation email',
    );
  });
});
