import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConfirmationEmailHandler } from '../confirmation-email.handler.js';
import type { MailerService } from '../../services/mailer.service.js';
import type { Logger } from '../../config/logger.js';
import type { ConfirmationEmailDto } from '../../dto/confirmation-email.dto.js';
import type { ChannelWrapper } from 'amqp-connection-manager';
import { EXCHANGE_NAME, QUEUE_CONFIG } from '../../messaging/rabbitmq.js';

function createMocks() {
  const mailer = {
    sendConfirmationEmail: vi.fn(),
  } as unknown as MailerService;

  const channel = {
    publish: vi.fn().mockResolvedValue(undefined),
  } as unknown as ChannelWrapper;

  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as Logger;

  return { mailer, channel, logger };
}

describe('createConfirmationEmailHandler', () => {
  let mailer: MailerService;
  let channel: ChannelWrapper;
  let logger: Logger;
  let handler: (data: ConfirmationEmailDto) => Promise<void>;

  const dto: ConfirmationEmailDto = {
    to: 'user@example.com',
    repo: 'owner/repo',
    confirmToken: '123e4567-e89b-12d3-a456-426614174000',
  };

  beforeEach(() => {
    ({ mailer, channel, logger } = createMocks());
    handler = createConfirmationEmailHandler(mailer, channel, logger);
  });

  it('should send email and publish success saga reply', async () => {
    await handler(dto);

    expect(mailer.sendConfirmationEmail).toHaveBeenCalledOnce();
    expect(mailer.sendConfirmationEmail).toHaveBeenCalledWith(
      dto.to,
      dto.repo,
      dto.confirmToken,
    );

    expect(channel.publish).toHaveBeenCalledOnce();
    expect(channel.publish).toHaveBeenCalledWith(
      EXCHANGE_NAME,
      QUEUE_CONFIG.SAGA_REPLY.routingKey,
      {
        type: 'ConfirmationEmailSent',
        payload: { confirmToken: dto.confirmToken },
      },
      { persistent: true },
    );
  });

  it('should publish failure saga reply when mailer fails and not throw', async () => {
    const error = new Error('send failed');
    vi.mocked(mailer.sendConfirmationEmail).mockRejectedValueOnce(error);

    await expect(handler(dto)).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      { err: error, to: dto.to },
      'failed to send confirmation email',
    );

    expect(channel.publish).toHaveBeenCalledOnce();
    expect(channel.publish).toHaveBeenCalledWith(
      EXCHANGE_NAME,
      QUEUE_CONFIG.SAGA_REPLY.routingKey,
      {
        type: 'ConfirmationEmailFailed',
        payload: { confirmToken: dto.confirmToken, error: 'send failed' },
      },
      { persistent: true },
    );
  });
});
