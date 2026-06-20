import { Resend } from 'resend';
import config from './config/env.js';
import { createLogger } from './config/logger.js';
import { MailerService } from './services/mailer.service.js';
import { startWorker } from './app.js';

const logger = createLogger();
const resend = new Resend(config.RESEND_API_KEY);
export const mailer = new MailerService(resend, logger);

startWorker(config.DATABASE_URL, mailer, logger).catch((err) => {
  logger.fatal({ err }, 'failed to start worker');
  process.exit(1);
});
