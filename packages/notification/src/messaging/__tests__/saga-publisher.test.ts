import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SagaReplyPublisher } from '../saga-publisher.js';
import { EXCHANGE_NAME, QUEUE_CONFIG } from '../rabbitmq.js';
import type { ChannelWrapper } from 'amqp-connection-manager';

describe('SagaReplyPublisher', () => {
  const CONFIRM_TOKEN = 'test-confirm-token';
  let mockChannel: { publish: ReturnType<typeof vi.fn> };
  let publisher: SagaReplyPublisher;

  beforeEach(() => {
    mockChannel = { publish: vi.fn().mockResolvedValue(undefined) };
    publisher = new SagaReplyPublisher(mockChannel as unknown as ChannelWrapper);
  });

  describe('publishSuccess', () => {
    it('should publish success reply with correct payload and routing key', async () => {
      await publisher.publishSuccess(CONFIRM_TOKEN);

      expect(mockChannel.publish).toHaveBeenCalledOnce();
      expect(mockChannel.publish).toHaveBeenCalledWith(
        EXCHANGE_NAME,
        QUEUE_CONFIG.SAGA_REPLY.routingKey,
        {
          type: 'ConfirmationEmailSent',
          payload: { confirmToken: CONFIRM_TOKEN },
        },
        { persistent: true },
      );
    });
  });

  describe('publishFailure', () => {
    it('should publish failure reply with error message and routing key', async () => {
      const error = new Error('SMTP timeout');

      await publisher.publishFailure(CONFIRM_TOKEN, error);

      expect(mockChannel.publish).toHaveBeenCalledOnce();
      expect(mockChannel.publish).toHaveBeenCalledWith(
        EXCHANGE_NAME,
        QUEUE_CONFIG.SAGA_REPLY.routingKey,
        {
          type: 'ConfirmationEmailFailed',
          payload: { confirmToken: CONFIRM_TOKEN, error: 'SMTP timeout' },
        },
        { persistent: true },
      );
    });
  });
});
