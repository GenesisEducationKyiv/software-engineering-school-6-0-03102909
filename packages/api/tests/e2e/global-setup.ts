import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { execSync, type ChildProcess, spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pgContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;
let wiremockContainer: StartedTestContainer;
let rabbitmqContainer: StartedTestContainer;
let appProcess: ChildProcess;

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(url).catch(() => null);
    if (res?.ok) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

export default async function globalSetup() {
  pgContainer = await new PostgreSqlContainer('postgres:17-alpine').start();
  redisContainer = await new RedisContainer('redis:7-alpine').start();
  wiremockContainer = await new GenericContainer('wiremock/wiremock:latest')
    .withExposedPorts(8080)
    .start();
  rabbitmqContainer = await new GenericContainer('rabbitmq:3-alpine')
    .withExposedPorts(5672)
    .start();

  const databaseUrl = pgContainer.getConnectionUri();
  const redisUrl = redisContainer.getConnectionUrl();
  const wiremockUrl = `http://${wiremockContainer.getHost()}:${wiremockContainer.getMappedPort(8080)}`;
  const rabbitmqUrl = `amqp://${rabbitmqContainer.getHost()}:${rabbitmqContainer.getMappedPort(5672)}`;

  await fetch(`${wiremockUrl}/__admin/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request: { method: 'GET', url: '/repos/facebook/react' },
      response: { status: 200, jsonBody: { owner: { login: 'facebook' }, name: 'react' } },
    }),
  });

  await fetch(`${wiremockUrl}/__admin/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request: { method: 'GET', url: '/repos/facebook/react/releases/latest' },
      response: { status: 200, jsonBody: { tag_name: 'v1.0.0' } },
    }),
  });
  const apiDir = join(__dirname, '../../');

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    cwd: apiDir,
  });

  appProcess = spawn('npx', ['tsx', join(apiDir, 'src/index.ts')], {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      REDIS_URL: redisUrl,
      RABBITMQ_URL: rabbitmqUrl,
      GITHUB_API_URL: wiremockUrl,
      PORT: '3099',
      API_KEY: 'test-api-key',
      RESEND_API_KEY: 're_test_dummy_key',
      NODE_ENV: 'test',
    },
    cwd: apiDir,
    stdio: 'pipe',
    detached: true,
  });

  appProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[app stderr] ${data.toString()}`);
  });
  appProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[app stdout] ${data.toString()}`);
  });

  await waitForServer('http://localhost:3099/metrics');
}

export async function globalTeardown() {
  if (appProcess?.pid) {
    try {
      process.kill(-appProcess.pid, 'SIGKILL');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ESRCH') {
        console.error('failed to kill app process');
      }
    }
  }
  if (rabbitmqContainer) await rabbitmqContainer.stop();
  if (wiremockContainer) await wiremockContainer.stop();
  if (redisContainer) await redisContainer.stop();
  if (pgContainer) await pgContainer.stop();
}
