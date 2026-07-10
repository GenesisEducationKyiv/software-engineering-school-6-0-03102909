import { createLogger } from './config/logger.js';
import { EmailVerificationService } from './services/email-verification.service.js';

export const logger = createLogger();

export const emailVerificationService = new EmailVerificationService(logger);
