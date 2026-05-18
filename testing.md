# Testing

## Prerequisites

- **Git**
- **Docker** (running)
- **Node.js** ≥ 22

## Setup

```bash
git clone https://github.com/GenesisEducationKyiv/software-engineering-school-6-0-03102909.git && cd software-engineering-school-6-0-03102909
npm ci
npx prisma generate
```

## Running Tests

### Unit Tests

```bash
npm run test
```

No external dependencies required. Runs with mocked services.

### Integration Tests

```bash
npm run test:integration
```

Automatically starts a PostgreSQL container via [Testcontainers](https://node.testcontainers.org/).  
No manual Docker setup needed — the container is created, migrated, and destroyed within the test lifecycle.

### E2E Tests

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

Automatically starts PostgreSQL and Redis containers, boots the real application server, and runs browser tests with Playwright.

### All Tests

```bash
npm run test && npm run test:integration && npm run test:e2e
```
