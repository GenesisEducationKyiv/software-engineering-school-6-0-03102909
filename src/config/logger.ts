import pino from 'pino';
import config from './env.js';

export interface ILogger {
  info(obj: Record<string, unknown>, msg?: string): void;
  info(msg: string): void;
  warn(obj: Record<string, unknown>, msg?: string): void;
  warn(msg: string): void;
  error(obj: Record<string, unknown>, msg?: string): void;
  error(msg: string): void;
  debug(obj: Record<string, unknown>, msg?: string): void;
  debug(msg: string): void;
  child(bindings: Record<string, unknown>): ILogger;
}

export function createLogger(): ILogger {
  return pino({
    level: config.LOG_LEVEL,
    redact: {
      paths: [
        'email',
        'to',
        'token'
      ],
      censor: '[REDACTED]',
    },
    ...(config.NODE_ENV !== 'production' && {
      transport: { target: 'pino-pretty' },
    }),
  });
}
