import pino, { type Logger } from 'pino';
import config from './env.js';

export type { Logger };

export function createLogger(): Logger {
  return pino({
    level: config.LOG_LEVEL,
    redact: {
      paths: ['email', 'to', 'token'],
      censor: '[REDACTED]',
    },
    ...(config.NODE_ENV !== 'production' && {
      transport: { target: 'pino-pretty' },
    }),
  });
}
