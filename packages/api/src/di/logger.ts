import { createLogger } from '@github-release-notification/shared';
import { loggerConfig } from '../config/logger.js';

export const logger = createLogger(loggerConfig);
