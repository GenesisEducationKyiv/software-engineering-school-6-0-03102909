import { Resend } from 'resend';
import config from './config/env.js';
import { createLogger } from './config/logger.js';
import { MailerService } from './services/mailer.service.js';
import { createApp } from './app.js';

const logger = createLogger();
const resend = new Resend(config.RESEND_API_KEY);
export const mailer = new MailerService(resend, logger);
const app = createApp(logger);

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'notification service started');
});
