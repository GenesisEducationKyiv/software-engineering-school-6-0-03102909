import 'dotenv/config';

export default {
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  PORT: Number(process.env['PORT']) || 3000,
  APP_URL: process.env['APP_URL'] ?? 'http://localhost:3000',
  DATABASE_URL: process.env['DATABASE_URL'] ?? '',
  GITHUB_TOKEN: process.env['GITHUB_TOKEN'] ?? '',
  SMTP_HOST: process.env['SMTP_HOST'] ?? '',
  SMTP_PORT: process.env['SMTP_PORT'] ?? '587',
  SMTP_USER: process.env['SMTP_USER'] ?? '',
  SMTP_PASS: process.env['SMTP_PASS'] ?? '',
  SMTP_FROM: process.env['SMTP_FROM'] ?? 'noreply@example.com',
};
