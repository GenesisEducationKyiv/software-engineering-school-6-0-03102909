import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '../../.env') });
config();

export default {
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  APP_URL: process.env['APP_URL'] ?? 'http://localhost:3000',
  NOTIFICATION_PORT: parseInt(process.env['NOTIFICATION_PORT'] ?? '3100', 10),
  GRPC_HOST: process.env['GRPC_HOST'] ?? '0.0.0.0',
  GRPC_PORT: parseInt(process.env['GRPC_PORT'] ?? '50051', 10),
  RABBITMQ_URL: process.env['RABBITMQ_URL'] ?? 'amqp://guest:guest@localhost:5672',
  RABBITMQ_PREFETCH: parseInt(process.env['RABBITMQ_PREFETCH'] ?? '10', 10),
  RESEND_API_KEY: process.env['RESEND_API_KEY'] ?? '',
  LOG_LEVEL: process.env['LOG_LEVEL'] ?? 'info',
  EMAIL_FROM: process.env['EMAIL_FROM'] ?? 'GitHub Notifier <noreply@githubnotifier.tech>',
};
