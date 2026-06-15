import pino, { type Logger, type LoggerOptions } from 'pino';

export type { Logger };

export function createLogger(options: LoggerOptions): Logger {
  return pino(options);
}
