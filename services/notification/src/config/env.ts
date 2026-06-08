import 'dotenv/config';

export default {
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  PORT: Number(process.env['PORT']) || 3002,
  APP_URL: process.env['APP_URL'] ?? 'http://localhost:3000',
  RESEND_API_KEY: process.env['RESEND_API_KEY'] ?? '',
  LOG_LEVEL: process.env['LOG_LEVEL'] ?? 'info',
};
