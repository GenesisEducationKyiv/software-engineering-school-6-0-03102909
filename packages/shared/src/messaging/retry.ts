import type { Logger } from '../logger.js';

export interface RetryPolicy {
  maxAttempts: number;
  delayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = { maxAttempts: 3, delayMs: 1000 };

export async function processWithRetry<T>(
  data: T,
  handler: (data: T) => Promise<void>,
  logger: Logger,
  context: string,
  retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY,
): Promise<boolean> {
  let attempts = 0;
  while (attempts < retryPolicy.maxAttempts) {
    attempts++;
    try {
      await handler(data);
      return true;
    } catch (err) {
      if (attempts >= retryPolicy.maxAttempts) {
        logger.error({ err, context }, 'handler failed after retries');
      } else {
        logger.warn({ err, context, attempt: attempts }, 'handler failed, retrying...');
        await new Promise((r) => setTimeout(r, retryPolicy.delayMs));
      }
    }
  }
  return false;
}
