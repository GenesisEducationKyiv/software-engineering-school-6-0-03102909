import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import { Pool } from 'pg';

let container: StartedPostgreSqlContainer;
let pool: Pool;

export async function startPostgres(): Promise<string> {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();

  const databaseUrl = container.getConnectionUri();

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  pool = new Pool({ connectionString: databaseUrl });

  return databaseUrl;
}

export async function truncateTables(): Promise<void> {
  await pool.query(
    'TRUNCATE TABLE subscriptions, repositories, subscribers CASCADE',
  );
}

export async function stopPostgres(): Promise<void> {
  await pool.end();
  await container.stop();
}
