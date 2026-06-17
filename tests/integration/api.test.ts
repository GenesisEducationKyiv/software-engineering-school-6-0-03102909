import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import {
  startPostgres,
  stopPostgres,
  truncateTables,
  getConfirmToken,
  getUnsubscribeToken,
} from './setup.js';

vi.mock('../../src/db/redis.js', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    connect: vi.fn(),
    quit: vi.fn(),
  },
  connectRedis: vi.fn(),
  disconnectRedis: vi.fn(),
}));

vi.mock('../../src/db/boss.js', () => ({
  default: {
    send: vi.fn().mockResolvedValue('mock-job-id'),
    createQueue: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
  startBoss: vi.fn(),
  stopBoss: vi.fn(),
}));

vi.mock('../../src/shared/github/github.service.js', () => {
  class GithubService {
    validateRepository = vi.fn().mockResolvedValue({ owner: 'owner', name: 'repo' });
    getLatestRelease = vi.fn().mockResolvedValue('v1.0.0');
  }
  return { GithubService, GithubApiError: class extends Error {} };
});

const API_KEY = 'test-api-key';

let app: typeof import('../../src/app.js').default;

beforeAll(async () => {
  const databaseUrl = await startPostgres();

  process.env['DATABASE_URL'] = databaseUrl;
  process.env['API_KEY'] = API_KEY;
  process.env['RESEND_API_KEY'] = 're_test_dummy_key';

  const appModule = await import('../../src/app.js');
  app = appModule.default;
});

afterAll(async () => {
  await stopPostgres();
});

beforeEach(async () => {
  await truncateTables();
});

function authGet(path: string) {
  return request(app).get(path).set('X-API-Key', API_KEY);
}

describe('API Integration Tests', () => {
  describe('POST /api/subscribe', () => {
    it('should return 200 on successful subscription', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'test@example.com', repo: 'owner/repo' });

      expect(response.status).toBe(202);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('message');

      const listResponse = await authGet('/api/subscriptions?email=test@example.com');
      expect(listResponse.body).toHaveLength(1);
      expect(listResponse.body[0]).toMatchObject({
        email: 'test@example.com',
        repo: 'owner/repo',
        confirmed: false,
      });
    });

    it('should return 409 when subscribing same confirmed email+repo twice', async () => {
      await request(app)
        .post('/api/subscribe')
        .send({ email: 'dup@example.com', repo: 'owner/repo' });

      const token = await getConfirmToken('dup@example.com');
      await request(app).get(`/api/confirm/${token}`);

      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'dup@example.com', repo: 'owner/repo' });

      expect(response.status).toBe(409);
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app).post('/api/subscribe').send({ repo: 'owner/repo' });

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 400 for missing repo', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 400 for invalid repo format', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'test@example.com', repo: 'invalidformat' });

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'notanemail', repo: 'owner/repo' });

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /api/confirm/:token', () => {
    it('should return 200 when subscription is confirmed', async () => {
      await request(app)
        .post('/api/subscribe')
        .send({ email: 'confirm@example.com', repo: 'owner/repo' });

      const token = await getConfirmToken('confirm@example.com');
      const response = await request(app).get(`/api/confirm/${token}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('message');

      const listResponse = await authGet('/api/subscriptions?email=confirm@example.com');
      expect(listResponse.body[0]).toMatchObject({ confirmed: true });
    });

    it('should return 404 when token is not found', async () => {
      const response = await request(app).get('/api/confirm/11111111-1111-1111-1111-111111111111');

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 400 when token is invalid format', async () => {
      const response = await request(app).get('/api/confirm/invalid-token');

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /api/unsubscribe/:token', () => {
    it('should return 200 when unsubscribed successfully', async () => {
      await request(app)
        .post('/api/subscribe')
        .send({ email: 'unsub@example.com', repo: 'owner/repo' });

      const token = await getUnsubscribeToken('unsub@example.com');
      const response = await request(app).get(`/api/unsubscribe/${token}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('message');

      const listResponse = await authGet('/api/subscriptions?email=unsub@example.com');
      expect(listResponse.body).toHaveLength(0);
    });

    it('should return 404 when token is not found', async () => {
      const response = await request(app).get(
        '/api/unsubscribe/22222222-2222-2222-2222-222222222222',
      );

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 400 when token is invalid format', async () => {
      const response = await request(app).get('/api/unsubscribe/invalid-token');

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /api/subscriptions', () => {
    it('should return 200 and array of subscriptions', async () => {
      await request(app)
        .post('/api/subscribe')
        .send({ email: 'list@example.com', repo: 'owner/repo' });

      const response = await authGet('/api/subscriptions?email=list@example.com');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(1);

      const item = response.body[0];
      expect(item).toHaveProperty('email', 'list@example.com');
      expect(item).toHaveProperty('repo', 'owner/repo');
      expect(item).toHaveProperty('confirmed');
      expect(item).toHaveProperty('last_seen_tag');
    });

    it('should return 200 and empty array when no subscriptions', async () => {
      const response = await authGet('/api/subscriptions?email=nobody@example.com');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(0);
    });

    it('should return 400 when email query is missing', async () => {
      const response = await authGet('/api/subscriptions');

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await authGet('/api/subscriptions?email=notanemail');

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 401 without API key', async () => {
      const response = await request(app).get('/api/subscriptions?email=test@example.com');

      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 401 with wrong API key', async () => {
      const response = await request(app)
        .get('/api/subscriptions?email=test@example.com')
        .set('X-API-Key', 'wrong-key');

      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toEqual({ error: 'Unauthorized: invalid or missing API key' });
    });
  });

  describe('GET /metrics', () => {
    it('should return 200 with metrics content', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
    });
  });

  describe('Unknown endpoint', () => {
    it('should return 404 for unknown route', async () => {
      const response = await request(app).get('/api/nonexistent');

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toEqual({ error: 'Unknown endpoint' });
    });
  });
});
