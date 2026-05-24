import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { execSync, type ChildProcess, spawn } from 'child_process';

let pgContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;
let wiremockContainer: StartedTestContainer;
let appProcess: ChildProcess;

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
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

  const databaseUrl = pgContainer.getConnectionUri();
  const redisUrl = redisContainer.getConnectionUrl();
  const wiremockUrl = `http://${wiremockContainer.getHost()}:${wiremockContainer.getMappedPort(8080)}`;

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

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  appProcess = spawn('npx', ['tsx', 'src/index.ts'], {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      REDIS_URL: redisUrl,
      GITHUB_API_URL: wiremockUrl,
      PORT: '3001',
      API_KEY: 'test-api-key',
      RESEND_API_KEY: 're_test_dummy_key',
      NODE_ENV: 'test',
    },
    stdio: 'pipe',
    detached: true,
  });

  appProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[app stderr] ${data.toString()}`);
  });

  await waitForServer('http://localhost:3001/metrics');
}

export async function globalTeardown() {
  if (appProcess?.pid) {
    try {
      process.kill(-appProcess.pid, 'SIGKILL');
    } catch {}
  }
  if (wiremockContainer) await wiremockContainer.stop();
  if (redisContainer) await redisContainer.stop();
  if (pgContainer) await pgContainer.stop();
}
