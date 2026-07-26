import type { LoggerOptions } from 'pino';
import config from './env.js';

export const loggerConfig: LoggerOptions = {
  level: config.LOG_LEVEL,
  redact: {
    paths: ['email', 'to', 'token'],
    censor: '[REDACTED]',
  },
  ...(config.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty' },
  }),
};
