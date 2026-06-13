import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '../../.env') });
config();

export default {
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  APP_URL: process.env['APP_URL'] ?? 'http://localhost:3000',
  DATABASE_URL: process.env['DATABASE_URL'] ?? '',
  RESEND_API_KEY: process.env['RESEND_API_KEY'] ?? '',
  LOG_LEVEL: process.env['LOG_LEVEL'] ?? 'info',
};
