# GitHub Release Notification API

**Live Demo:** [https://githubnotifier.tech](https://githubnotifier.tech)

An API service that allows users to subscribe to email notifications about new releases of their chosen GitHub repositories. Built with Node.js microservices and Dockerized infrastructure.

## Tech Stack

- Framework: Express.js (Node.js) & TypeScript
- Architecture: Microservices (API Service & Notification Service)
- Database: PostgreSQL with Prisma ORM
- Caching: Redis
- Message Broker: RabbitMQ
- Inter-service RPC: gRPC
- Scheduler: Croner
- Email Provider: Resend
- Validation: Zod
- Testing: Vitest, Playwright, Testcontainers
- Containerization: Docker & Docker Compose

## Setup & Installation

### 1. Environment Configuration

Based on the provided `.env.example`, create a `.env` file in the root directory.

```bash
cp .env.example .env
```

### 2. Run Environment (Docker)

The applications, database, message broker, and redis cache are managed via Docker Compose.

```bash
docker compose up -d
```

### 3. Testing

Prerequisites: Node.js ≥ 22, Docker (running).

```bash
npm ci
npx prisma generate
```

**Unit tests**:

```bash
npm run test
```

**Integration tests**:

```bash
npm run test:integration
```

**E2E tests**:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

See [testing.md](testing.md) for details.

## Implementation Logic & API Endpoints

This section outlines the core logic and technical considerations implemented across the API.

### Process Flow

1. **Subscription:** Upon a valid request, the API service validates email disposable status via gRPC call to Notification Service, verifies repository existence via GitHub API, creates an unconfirmed subscription, and publishes a confirmation email job to RabbitMQ.
2. **Background Scanner:** A scheduled task periodically queries GitHub for the latest release information of all confirmed subscriptions. If external GitHub API rate limits (`429`) are exceeded, the scanner catches the error and cleanly aborts the current sequence to prevent provider bans, gracefully resuming on the next scheduled cron cycle. Redis caching further minimizes unnecessary external calls.
3. **Notification:** If a novel release tag is detected (differing from the stored `last_seen_tag`), a release notification message is published to RabbitMQ. The Notification Service consumes the event and sends emails via Resend API.

### API Endpoints

#### `POST /subscribe`

Validates the repository against the GitHub API and creates an unconfirmed subscription.

- Re-subscribing acts redundantly as a "resend confirmation" mechanism for unconfirmed accounts, circumventing deadlocks for users who miss their initial token emails. Abuse is contained via an IP-based `express-rate-limit`.

#### `GET /confirm/:token`

Confirms the subscription enabling it for future release scanning.

#### `GET /unsubscribe/:token`

Permanently deletes the subscription associated with the provided unique token.

#### `GET /subscriptions`

Retrieves a list of all active or pending subscriptions for a specified email address.

- This endpoint is protected via an API Key (`x-api-key` header) to restrict unauthorized access to user subscription data.

### System Endpoints

#### `GET /metrics`

Prometheus metrics exporter endpoint providing real-time application and system performance data.

#### `GET /api-docs`

Swagger UI documentation for the API.
