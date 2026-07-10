import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  connectRabbitMQ, 
  disconnectRabbitMQ, 
  consumeQueue, 
  EXCHANGE_NAME, 
  DLX_EXCHANGE, 
  DLQ_NAME, 
  QUEUE_CONFIG 
} from '../rabbitmq.js';
import amqp from 'amqp-connection-manager';
import type { Logger } from '../../config/logger.js';
import { z } from 'zod';

vi.mock('amqp-connection-manager', () => ({
  default: {
    connect: vi.fn(),
  },
}));

describe('RabbitMQ Messaging', () => {
  let mockConnection: any;
  let mockChannelWrapper: any;
  let mockConfirmChannel: any;
  let mockLogger: any;

  beforeEach(() => {
    mockConfirmChannel = {
      assertExchange: vi.fn(),
      assertQueue: vi.fn(),
      bindQueue: vi.fn(),
      prefetch: vi.fn(),
      consume: vi.fn(),
      ack: vi.fn(),
      nack: vi.fn(),
    };

    mockChannelWrapper = {
      waitForConnect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      addSetup: vi.fn(async (setupFn) => await setupFn(mockConfirmChannel)),
      ack: vi.fn(),
      nack: vi.fn(),
    };

    mockConnection = {
      on: vi.fn(),
      createChannel: vi.fn().mockReturnValue(mockChannelWrapper),
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(amqp.connect).mockReturnValue(mockConnection);

    mockLogger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await disconnectRabbitMQ(mockLogger);
  });

  describe('connectRabbitMQ', () => {
    it('should connect and assert expected topology', async () => {
      const prefetch = 5;
      const channel = await connectRabbitMQ('amqp://localhost', prefetch, mockLogger);
      
      expect(amqp.connect).toHaveBeenCalledWith(['amqp://localhost']);
      expect(mockConnection.createChannel).toHaveBeenCalled();
      
      const [channelConfig] = mockConnection.createChannel.mock.calls[0];
      const setupCall = channelConfig.setup;
      await setupCall(mockConfirmChannel);

      expect(mockConfirmChannel.assertExchange).toHaveBeenCalledWith(DLX_EXCHANGE, 'fanout', { durable: true });
      expect(mockConfirmChannel.assertQueue).toHaveBeenCalledWith(DLQ_NAME, { durable: true });
      expect(mockConfirmChannel.bindQueue).toHaveBeenCalledWith(DLQ_NAME, DLX_EXCHANGE, '');

      expect(mockConfirmChannel.assertExchange).toHaveBeenCalledWith(EXCHANGE_NAME, 'direct', { durable: true });
      
      for (const { queue, routingKey } of Object.values(QUEUE_CONFIG)) {
        expect(mockConfirmChannel.assertQueue).toHaveBeenCalledWith(queue, { 
          durable: true,
          deadLetterExchange: DLX_EXCHANGE
        });
        expect(mockConfirmChannel.bindQueue).toHaveBeenCalledWith(queue, EXCHANGE_NAME, routingKey);
      }
      
      expect(mockConfirmChannel.prefetch).toHaveBeenCalledWith(prefetch);
      expect(channel).toBe(mockChannelWrapper);
    });
  });

  describe('consumeQueue', () => {
    const schema = z.object({ id: z.string() });

    beforeEach(async () => {
      await connectRabbitMQ('amqp://localhost', 10, mockLogger);
      vi.clearAllMocks();
    });

    it('should throw error if channel is not initialized', async () => {
      await disconnectRabbitMQ(mockLogger);
      await expect(
        consumeQueue('test-queue', schema, vi.fn(), mockLogger)
      ).rejects.toThrow('Channel not initialized');
    });

    it('should ack message on successful handler execution', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      await consumeQueue('test-queue', schema, handler, mockLogger);

      const [, consumeCallback] = mockConfirmChannel.consume.mock.calls[0];
      const validMsg = { content: Buffer.from(JSON.stringify({ id: '123' })) };
      
      await consumeCallback(validMsg);

      expect(handler).toHaveBeenCalledWith({ id: '123' });
      expect(mockConfirmChannel.ack).toHaveBeenCalledWith(validMsg);
      expect(mockConfirmChannel.nack).not.toHaveBeenCalled();
    });

    it('should nack message without requeue if schema validation fails', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      await consumeQueue('test-queue', schema, handler, mockLogger);

      const [, consumeCallback] = mockConfirmChannel.consume.mock.calls[0];
      const invalidMsg = { content: Buffer.from(JSON.stringify({ wrong: 'data' })) };
      
      await consumeCallback(invalidMsg);

      expect(handler).not.toHaveBeenCalled();
      expect(mockConfirmChannel.ack).not.toHaveBeenCalled();
      expect(mockConfirmChannel.nack).toHaveBeenCalledWith(invalidMsg, false, false);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should nack message without requeue if handler fails', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler logic error'));
      await consumeQueue('test-queue', schema, handler, mockLogger);

      const [, consumeCallback] = mockConfirmChannel.consume.mock.calls[0];
      const validMsg = { content: Buffer.from(JSON.stringify({ id: '123' })) };
      
      await consumeCallback(validMsg);

      expect(handler).toHaveBeenCalled();
      expect(mockConfirmChannel.ack).not.toHaveBeenCalled();
      expect(mockConfirmChannel.nack).toHaveBeenCalledWith(validMsg, false, false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
    
    it('should register consumer setup via addSetup to handle reconnects automatically', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      await consumeQueue('test-queue', schema, handler, mockLogger);
      
      expect(mockChannelWrapper.addSetup).toHaveBeenCalledOnce();
      expect(mockConfirmChannel.consume).toHaveBeenCalledWith('test-queue', expect.any(Function));
    });
    
    it('should silently ignore null messages', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      await consumeQueue('test-queue', schema, handler, mockLogger);

      const [, consumeCallback] = mockConfirmChannel.consume.mock.calls[0];
      
      await consumeCallback(null);

      expect(handler).not.toHaveBeenCalled();
      expect(mockConfirmChannel.ack).not.toHaveBeenCalled();
      expect(mockConfirmChannel.nack).not.toHaveBeenCalled();
    });
  });
});
