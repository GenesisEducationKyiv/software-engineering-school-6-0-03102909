import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const API_KEY = vi.hoisted(() => {
  const key = 'test-api-key';
  process.env['API_KEY'] = key;
  return key;
});

import app from '../src/app.js';
import { HttpError } from '../src/errors/HttpError.js';

vi.mock('../src/services/subscription.service.js', () => ({
  subscribe: vi.fn(),
  confirmSubscription: vi.fn(),
  unsubscribe: vi.fn(),
  getSubscriptions: vi.fn(),
}));

import * as subscriptionService from '../src/services/subscription.service.js';

function authGet(path: string) {
  return request(app).get(path).set('X-API-Key', API_KEY);
}

function authPost(path: string) {
  return request(app).post(path).set('X-API-Key', API_KEY);
}

describe('API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/subscribe', () => {
    it('should return 200 on successful subscription', async () => {
      (subscriptionService.subscribe as any).mockResolvedValue({ id: 1 });

      const response = await authPost('/api/subscribe').send({
        email: 'test@example.com',
        repo: 'owner/repo',
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 400 for missing email', async () => {
      const response = await authPost('/api/subscribe').send({ repo: 'owner/repo' });

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 400 for missing repo', async () => {
      const response = await authPost('/api/subscribe').send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 400 for invalid repo format', async () => {
      const response = await authPost('/api/subscribe').send({
        email: 'test@example.com',
        repo: 'invalidformat',
      });

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await authPost('/api/subscribe').send({
        email: 'notanemail',
        repo: 'owner/repo',
      });

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 404 if repository is not found on GitHub', async () => {
      (subscriptionService.subscribe as any).mockRejectedValue(new HttpError('Not found', 404));

      const response = await authPost('/api/subscribe').send({
        email: 'test@example.com',
        repo: 'bad/repo',
      });

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 409 if email is already subscribed', async () => {
      (subscriptionService.subscribe as any).mockRejectedValue(new HttpError('Conflict', 409));

      const response = await authPost('/api/subscribe').send({
        email: 'test@example.com',
        repo: 'owner/repo',
      });

      expect(response.status).toBe(409);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 401 without API key', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'test@example.com', repo: 'owner/repo' });

      expect(response.status).toBe(401);
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /api/confirm/:token', () => {
    it('should return 200 when subscription is confirmed', async () => {
      (subscriptionService.confirmSubscription as any).mockResolvedValue({ id: 1 });

      const response = await request(app).get('/api/confirm/valid-token');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 404 when token is not found', async () => {
      (subscriptionService.confirmSubscription as any).mockRejectedValue(
        new HttpError('Not found', 404),
      );

      const response = await request(app).get('/api/confirm/bad-token');

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 400 when token is invalid', async () => {
      (subscriptionService.confirmSubscription as any).mockRejectedValue(
        new HttpError('Invalid token', 400),
      );

      const response = await request(app).get('/api/confirm/invalid-token');

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /api/unsubscribe/:token', () => {
    it('should return 200 when unsubscribed successfully', async () => {
      (subscriptionService.unsubscribe as any).mockResolvedValue(undefined);

      const response = await request(app).get('/api/unsubscribe/valid-token');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 404 when token is not found', async () => {
      (subscriptionService.unsubscribe as any).mockRejectedValue(new HttpError('Not found', 404));

      const response = await request(app).get('/api/unsubscribe/bad-token');

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return 400 when token is invalid', async () => {
      (subscriptionService.unsubscribe as any).mockRejectedValue(
        new HttpError('Invalid token', 400),
      );

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
  });
});
