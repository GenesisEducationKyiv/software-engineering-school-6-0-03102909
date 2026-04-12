# GitHub Release Notification API

**Live Demo:** [https://githubnotifier.tech](https://githubnotifier.tech)

An API service that allows users to subscribe to email notifications about new releases of their chosen GitHub repositories. Built as a Node.js monolith with a Dockerized infrastructure.

## Tech Stack

- Framework: Express.js (Node.js) & TypeScript
- Database: PostgreSQL with Prisma ORM
- Caching: Redis
- Queue/Scheduler: pg-boss
- Email Provider: Resend
- Validation: Zod
- Testing: Vitest
- Containerization: Docker & Docker Compose

## Setup & Installation

### 1. Environment Configuration

Based on the provided `.env.example`, create a `.env` file in the root directory.

```bash
cp .env.example .env
```

### 2. Run Environment (Docker)

The application, database, and redis cache are managed via Docker Compose.

```bash
docker compose up -d
```

### 3. Testing

To run the automated unit tests covering the business logic:

```bash
npm run test
```

_(Dependencies must be installed locally via `npm install` before running tests outside of a container)._

## Implementation Logic & API Endpoints

This section outlines the core logic and technical considerations implemented across the API.

### Process Flow

1. **Subscription:** Upon a valid request, the application verifies the repository's existence via the GitHub API and creates an unconfirmed subscription.
2. **Background Scanner:** A `pg-boss` scheduled job periodically queries GitHub for the latest release information of all confirmed subscriptions. If external GitHub API rate limits (`429`) are exceeded, the scanner catches the error and cleanly aborts the current sequence to prevent provider bans, gracefully resuming on the next scheduled cron cycle. Redis caching further minimizes unnecessary external calls.
3. **Notification:** If a novel release tag is detected (differing from the stored `last_seen_tag`), an email notification job is enqueued to Resend, and the repository's `last_seen_tag` is updated.

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
