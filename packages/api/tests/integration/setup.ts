import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let container: StartedPostgreSqlContainer;
let pool: Pool;

export async function startPostgres(): Promise<string> {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();

  const databaseUrl = container.getConnectionUri();
  const apiDir = join(__dirname, '../../');

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    cwd: apiDir,
  });

  pool = new Pool({ connectionString: databaseUrl });

  return databaseUrl;
}

export async function truncateTables(): Promise<void> {
  await pool.query(
    'TRUNCATE TABLE subscriptions, repositories, subscribers CASCADE',
  );
}

export async function query(sql: string, params?: unknown[]): Promise<import('pg').QueryResult> {
  return pool.query(sql, params);
}

// helpers - tokens are not exposed via api 

export async function getConfirmToken(email: string): Promise<string> {
  const result = await pool.query(
    'SELECT s.confirm_token FROM subscriptions s JOIN subscribers sub ON s.subscriber_id = sub.id WHERE sub.email = $1',
    [email],
  );
  return result.rows[0]?.confirm_token as string;
}

export async function getUnsubscribeToken(email: string): Promise<string> {
  const result = await pool.query(
    'SELECT s.unsubscribe_token FROM subscriptions s JOIN subscribers sub ON s.subscriber_id = sub.id WHERE sub.email = $1',
    [email],
  );
  return result.rows[0]?.unsubscribe_token as string;
}

export async function stopPostgres(): Promise<void> {
  if (pool) await pool.end();
  if (container) await container.stop();
}
