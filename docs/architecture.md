# Architecture: GitHub Release Notification API

## 1. High-Level Overview

The system allows users to subscribe to email notifications about new releases of a chosen GitHub repository. It is built as a monorepo with two microservices that communicate asynchronously via **RabbitMQ** and synchronously via **gRPC**. 

- **API Service** — handles user-facing HTTP requests, manages subscriptions, and runs a cron-based scanner that detects new GitHub releases
- **Notification Service** — sends emails (confirmation and release notifications), verifies email addresses, and reports delivery results back via a saga pattern
- **Shared Package** — contains DTOs (Zod schemas), RabbitMQ connection logic, retry utilities, protobuf-generated gRPC stubs, and shared types used by both services

```mermaid
flowchart TD
    User([User])

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

    User -->|HTTPS| API

    API --> Postgres
    API -->|Caching| Redis
    API -->|gRPC| Notification
    API --> GitHub

    API -->|Publish email tasks| RabbitMQ
    RabbitMQ -->|Deliver email tasks| Notification
    Notification -->|Publish saga reply| RabbitMQ
    RabbitMQ -->|Deliver saga reply| API
    Notification -->|Send emails| Resend

    API -->|Scraped by| Prometheus
    Prometheus -->|Queried by| Grafana
    API -->|Logs read by| Filebeat
    Notification -->|Logs read by| Filebeat
    Filebeat -->|Pushes logs to| Elasticsearch
    Elasticsearch -->|Queried by| Kibana
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


---

## 3. Key Flows

### 3.1 Subscription Flow 

```mermaid
sequenceDiagram
    actor User
    participant API
    participant Notification
    participant GitHub
    participant RabbitMQ
    participant Resend
    participant DB as PostgreSQL

    User->>API: POST /api/subscribe
    API->>Notification: gRPC verifyEmail
    Notification-->>API: valid

    API->>GitHub: validate repo via GitHub API
    GitHub-->>API: valid repository
    API->>DB: createOrGet subscription
    DB-->>API: subscription + confirmToken

    API->>RabbitMQ: publish confirmation-email
    API-->>User: 202 Accepted

    RabbitMQ->>Notification: deliver message
    Notification->>Resend: send confirmation email
    alt Success
        Resend-->>Notification: 200 OK
        Notification->>RabbitMQ: saga-reply SUCCESS
        RabbitMQ->>API: deliver saga reply
        Note over API: Subscription stays pending until user clicks confirm link
    else Failure
        Resend-->>Notification: Error
        Notification->>RabbitMQ: saga-reply FAILURE
        RabbitMQ->>API: deliver saga reply
        API->>DB: delete pending subscription
    end

    User->>API: GET /api/confirm/token
    API->>DB: confirm subscription
    API-->>User: 200 OK
```

### 3.2 Release Scan & Notification Flow

```mermaid
sequenceDiagram
    participant Cron
    participant Scanner
    participant GitHub
    participant DB as PostgreSQL
    participant RabbitMQ
    participant Notification
    participant Resend
    actor User

    Cron->>Scanner: scanAllRepositories
    Scanner->>DB: findAllWithConfirmedSubscriptions
    DB-->>Scanner: repositories

    loop For each repository
        Scanner->>GitHub: getLatestRelease
        GitHub-->>Scanner: latestTag

        alt New release detected
            Scanner->>DB: findConfirmedSubscribersByRepo
            DB-->>Scanner: subscribers

            loop For each subscriber
                Scanner->>RabbitMQ: publish release-notification
            end

            Scanner->>DB: updateLastSeenTag
        end
    end

    RabbitMQ->>Notification: deliver message
    Notification->>Resend: send release email
    Resend-->>User: Email delivered
```
