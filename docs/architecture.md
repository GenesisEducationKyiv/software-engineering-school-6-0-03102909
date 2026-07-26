# Architecture: GitHub Release Notification API

## 1. High-Level Overview

The system allows users to subscribe to email notifications about new releases of a chosen GitHub repository. It is built as a monorepo with two microservices that communicate asynchronously via **RabbitMQ** and synchronously via **gRPC**.

### API Service

- HTTP API: subscribe, confirm, unsubscribe, list subscriptions
- Email verification via gRPC call to Notification Service
- Repository validation via GitHub API
- Cron-based release scanner — polls GitHub for new tags
- Publishes email tasks to RabbitMQ (confirmation + release notification)
- Handles saga replies — compensates on email delivery failure (deletes pending subscription)

### Notification Service

- gRPC server for email verification
- Consumes RabbitMQ queues: `confirmation-email`, `release-notification`
- Sends emails via Resend API
- Publishes saga replies back to RabbitMQ
- Retry on delivery failures

### Shared Package

- DTOs with Zod schemas for queue message validation
- RabbitMQ connection and queue configuration
- Protobuf-generated gRPC stubs
- Retry utilities and shared types

### Infrastructure

```mermaid
flowchart TD
    subgraph Application["Application Services"]
        API["API Service"]
        Notification["Notification Service"]
    end

    subgraph Data_Stores["Data Stores"]
        Postgres[(PostgreSQL)]
        Redis[(Redis)]
    end

    subgraph Broker["Message Broker"]
        RabbitMQ["RabbitMQ"]
    end

    subgraph External["External APIs"]
        GitHub["GitHub API"]
        Resend["Resend Email API"]
    end

    subgraph Observability["Observability Stack"]
        Prometheus["Prometheus"]
        Grafana["Grafana"]
        Elasticsearch["Elasticsearch"]
        Kibana["Kibana"]
        Filebeat["Filebeat"]
    end

    API <--> Postgres
    API <--> Redis
    API -->|gRPC| Notification
    API <-->|REST| GitHub
    API <-->|AMQP| RabbitMQ
    Notification <-->|AMQP| RabbitMQ
    Notification -->|REST| Resend

    API -->|metrics| Prometheus
    Prometheus -->|metrics| Grafana
    API -->|logs| Filebeat
    Notification -->|logs| Filebeat
    Filebeat -->|logs| Elasticsearch
    Elasticsearch -->|logs| Kibana
```

### User Flow

```mermaid
flowchart LR
    User([User])
    API["API Service"]
    Notification["Notification Service"]
    GitHub["GitHub API"]
    RabbitMQ["RabbitMQ"]
    Resend["Resend Email API"]
    DB[(PostgreSQL)]

    User -->|Subscribe / Confirm / Unsubscribe| API
    API -->|Validate repository| GitHub
    API -->|Verify email| Notification
    API -->|Store subscription| DB

    API -->|Queue email task| RabbitMQ
    RabbitMQ -->|Deliver task| Notification
    Notification -->|Send email| Resend
    Resend -->|Deliver email| User
```

---

## 2. Layered Architecture

Both services follow a **layered architecture** with dependency inversion — business logic depends on interfaces, not concrete implementations.

```mermaid
flowchart TD
    subgraph Presentation["Presentation"]
        Routes["HTTP Routes & Controllers"]
        GrpcH["gRPC Handlers"]
    end

    subgraph Service["Service"]
        BL["Business Logic"]
        Saga["Saga Handlers"]
    end

    subgraph Repository["Repository"]
        Repo["ISubscriptionRepository\nIRepositoryRepository"]
    end

    subgraph Infrastructure["Infrastructure"]
        APIAdapters["External APIs\n(GitHub, Resend)"]
        Messaging["Messaging\n(RabbitMQ)"]
        Storage["Database\n(Prisma ORM)"]
        RPC["Internal RPC\n(gRPC)"]
    end

    Routes --> BL
    GrpcH --> BL

    BL --> Repo
    Saga --> Repo

    BL --> APIAdapters
    BL --> RPC
    BL --> Messaging

    Repo --> Storage
```
