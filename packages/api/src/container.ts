import type { ChannelWrapper } from 'amqp-connection-manager';
import { createNotificationQueue } from './di/infrastructure.js';
import { createScannerService } from './di/scanner.js';
import { createSubscriptionService, subscriptionSagaHandler } from './di/subscription.js';
import type { ScannerService } from './modules/scanner/index.js';
import type { SubscriptionService } from './modules/subscription/index.js';
import { SagaReplyConsumer } from './shared/messaging/saga-consumer.js';
import { logger } from './di/infrastructure.js';

export let scannerService: ScannerService;
export let subscriptionService: SubscriptionService;

export async function initContainer(channel: ChannelWrapper): Promise<void> {
  const notificationQueue = createNotificationQueue(channel);
  scannerService = createScannerService(notificationQueue);
  subscriptionService = createSubscriptionService(notificationQueue);

  const sagaConsumer = new SagaReplyConsumer(channel, logger);
  
  try {
    await sagaConsumer.startListening(subscriptionSagaHandler);
  } catch (err) {
    logger.error({ err }, 'Failed to start subscription saga listener');
    throw err;
  }
}
