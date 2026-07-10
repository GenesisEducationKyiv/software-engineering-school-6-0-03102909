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
  RABBITMQ_URL: process.env['RABBITMQ_URL'] ?? 'amqp://guest:guest@localhost:5672',
  SCAN_CRON: process.env['SCAN_CRON'] ?? '*/5 * * * *',
  LOG_LEVEL: process.env['LOG_LEVEL'] ?? 'info',
  NOTIFICATION_SERVICE_URL: process.env['NOTIFICATION_SERVICE_URL'] ?? 'http://localhost:3100',
  NOTIFICATION_GRPC_URL: process.env['NOTIFICATION_GRPC_URL'] ?? 'localhost:50051',
  NOTIFICATION_GRPC_TIMEOUT_MS: Number(process.env['NOTIFICATION_GRPC_TIMEOUT_MS']) || 5000,
};
