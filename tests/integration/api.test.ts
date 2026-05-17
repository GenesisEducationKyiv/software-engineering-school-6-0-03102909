import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const API_KEY = vi.hoisted(() => {
  const key = 'test-api-key';
  process.env['API_KEY'] = key;
  return key;
});

vi.mock('../../src/container.js', () => {
  const subscriptionService = {
    subscribe: vi.fn(),
    confirmSubscription: vi.fn(),
    unsubscribe: vi.fn(),
    getSubscriptions: vi.fn(),
  };
  return { subscriptionService };
});

import app from '../../src/app.js';
import { HttpError } from '../../src/errors/HttpError.js';
import { subscriptionService } from '../../src/container.js';

function authGet(path: string) {
  return request(app).get(path).set('X-API-Key', API_KEY);
}

describe('API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/subscribe', () => {
    it('should return 200 on successful subscription', async () => {
      (subscriptionService.subscribe as any).mockResolvedValue({ id: 1 });

      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'test@example.com', repo: 'owner/repo' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('message');
    });

    it('should call subscribe service with correct args', async () => {
      (subscriptionService.subscribe as any).mockResolvedValue({ id: 1 });

      await request(app)
        .post('/api/subscribe')
        .send({ email: 'Test@Example.com', repo: 'Owner/Repo' });

      expect(subscriptionService.subscribe).toHaveBeenCalledWith('test@example.com', 'owner/repo');
    });

    it('should return 500 when service throws unexpected error', async () => {
      (subscriptionService.subscribe as any).mockRejectedValue(new Error('DB connection lost'));

      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'test@example.com', repo: 'owner/repo' });

      expect(response.status).toBe(500);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toEqual({ error: 'Internal server error' });
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

    it('should return 404 if repository is not found on GitHub', async () => {
      (subscriptionService.subscribe as any).mockRejectedValue(new HttpError('Not found', 404));

      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'test@example.com', repo: 'bad/repo' });

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 409 if email is already subscribed', async () => {
      (subscriptionService.subscribe as any).mockRejectedValue(new HttpError('Conflict', 409));

      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'test@example.com', repo: 'owner/repo' });

      expect(response.status).toBe(409);
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /api/confirm/:token', () => {
    it('should return 200 when subscription is confirmed', async () => {
      (subscriptionService.confirmSubscription as any).mockResolvedValue({ id: 1 });

      const response = await request(app).get('/api/confirm/11111111-1111-1111-1111-111111111111');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('message');
    });

    it('should call confirmSubscription with correct token', async () => {
      (subscriptionService.confirmSubscription as any).mockResolvedValue({ id: 1 });

      await request(app).get('/api/confirm/11111111-1111-1111-1111-111111111111');

      expect(subscriptionService.confirmSubscription).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
      );
    });

    it('should return 404 when token is not found', async () => {
      (subscriptionService.confirmSubscription as any).mockRejectedValue(
        new HttpError('Not found', 404),
      );

      const response = await request(app).get('/api/confirm/22222222-2222-2222-2222-222222222222');

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 400 when token is invalid', async () => {
      // Service is not mocked to reject because Zod intercepts the invalid format before hitting the controller
      const response = await request(app).get('/api/confirm/invalid-token');

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /api/unsubscribe/:token', () => {
    it('should return 200 when unsubscribed successfully', async () => {
      (subscriptionService.unsubscribe as any).mockResolvedValue(undefined);

      const response = await request(app).get(
        '/api/unsubscribe/11111111-1111-1111-1111-111111111111',
      );

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('message');
    });

    it('should call unsubscribe with correct token', async () => {
      (subscriptionService.unsubscribe as any).mockResolvedValue(undefined);

      await request(app).get('/api/unsubscribe/11111111-1111-1111-1111-111111111111');

      expect(subscriptionService.unsubscribe).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
      );
    });

    it('should return 404 when token is not found', async () => {
      (subscriptionService.unsubscribe as any).mockRejectedValue(new HttpError('Not found', 404));

      const response = await request(app).get(
        '/api/unsubscribe/22222222-2222-2222-2222-222222222222',
      );

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 400 when token is invalid', async () => {
      // Service is not mocked to reject because Zod intercepts the invalid format before hitting the controller
      const response = await request(app).get('/api/unsubscribe/invalid-token');

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /api/subscriptions', () => {
    it('should return 200 and array matching Swagger schema', async () => {
      const mockData = [
        { email: 'test@example.com', repo: 'owner/repo1', confirmed: true, last_seen_tag: 'v1.0' },
        { email: 'test@example.com', repo: 'owner/repo2', confirmed: false, last_seen_tag: null },
      ];
      (subscriptionService.getSubscriptions as any).mockResolvedValue(mockData);

      const response = await authGet('/api/subscriptions?email=test@example.com');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(2);

      const item = response.body[0];
      expect(item).toHaveProperty('email');
      expect(item).toHaveProperty('repo');
      expect(item).toHaveProperty('confirmed');
      expect(item).toHaveProperty('last_seen_tag');
      expect(typeof item.email).toBe('string');
      expect(typeof item.repo).toBe('string');
      expect(typeof item.confirmed).toBe('boolean');
    });

    it('should return 200 and empty array when no subscriptions found', async () => {
      (subscriptionService.getSubscriptions as any).mockResolvedValue([]);

      const response = await authGet('/api/subscriptions?email=test@example.com');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(0);
    });

    it('should return 400 when email query parameter is missing', async () => {
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

    it('should call getSubscriptions with correct email', async () => {
      (subscriptionService.getSubscriptions as any).mockResolvedValue([]);

      await authGet('/api/subscriptions?email=test@example.com');

      expect(subscriptionService.getSubscriptions).toHaveBeenCalledWith('test@example.com');
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
