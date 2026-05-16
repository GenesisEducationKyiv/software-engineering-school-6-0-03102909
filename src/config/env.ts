import 'dotenv/config';

export default {
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  PORT: Number(process.env['PORT']) || 3000,
  APP_URL: process.env['APP_URL'] ?? 'http://localhost:3000',
  DATABASE_URL: process.env['DATABASE_URL'] ?? '',
  GITHUB_TOKEN: process.env['GITHUB_TOKEN'] ?? '',
  GITHUB_API_URL: process.env['GITHUB_API_URL'] ?? 'https://api.github.com',
  GITHUB_CACHE_TTL: Number(process.env['GITHUB_CACHE_TTL']) || 600,
  API_KEY: process.env['API_KEY'] ?? '',
  REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  // SMTP_USER: process.env['SMTP_USER'] ?? '',
  // SMTP_PASS: process.env['SMTP_PASS'] ?? '',
  // SMTP_FROM: process.env['SMTP_FROM'] ?? '',
  RESEND_API_KEY: process.env['RESEND_API_KEY'] ?? '',
  SCAN_CRON: process.env['SCAN_CRON'] ?? '*/5 * * * *',
};
