# System Design: GitHub Release Notification API

## 1. Вимоги системи

### Функціональні вимоги

- Користувачі можуть підписатися на оновлення конкретного репозиторію на GitHub
- Для підписки користувач повинен підтвердити свій email (через лист із посиланням на підтвердження)
- Система періодично сканує GitHub на наявність нових релізів
- При знаходженні нового релізу система розсилає email-сповіщення всім підписникам цього репозиторію
- Користувачі можуть відписатися за допомогою посилання в кожному листі

### Нефункціональні вимоги

- **Доступність:** 99.9% uptime для публічного API підписок
- **Затримка:** < 300ms для відповідей REST API
- **Надійність:** Гарантована відправка листів без втрат (retries x3)

### Обмеження

- **GitHub API Rate Limits:** До 5000 запитів на годину
- **Resend Rate Limits:** До 3000 листів на місяць
- **Budget:** Мінімальна інфраструктура

## 2. High-Level архітектура

```mermaid
flowchart TD
    User([User])

    subgraph Docker["Docker Compose"]
        API[API Service]
        Scanner[Scanner Service]
        Notification["Notification Service (Microservice)"]
        RabbitMQ[(RabbitMQ)]
        Redis[(Redis)]
        DB[(PostgreSQL)]
    end

    GitHub[GitHub API]
    Resend[Resend API]

    User -- "HTTP requests" --> API
    API -- "Store & query data" --> DB
    API -. "Check rate limits" .-> Redis
    API -- "gRPC: verifyEmail" --> Notification

    DB -- "Fetch subscriptions" --> Scanner
    Scanner -. "Cache release tags" .-> Redis
    GitHub -- "Fetch latest releases" --> Scanner

    API -- "Publish email jobs" --> RabbitMQ
    Scanner -- "Publish release jobs" --> RabbitMQ
    RabbitMQ -- "Deliver email jobs" --> Notification
    Notification -- "Send email" --> Resend
    Resend -- "Deliver email" --> User
```

## 3. Детальний дизайн компонентів

### 3.1 API Service (Node.js/Express)

**Відповідальність:** приймає користувацькі запити, керує підписками та зберігає їх у базі даних.

**Основні функції сервісу:**

- Обробка запитів на підписку, підтвердження та відписку
- Перевірка email через Notification Service (gRPC `verifyEmail`)
- Валідація репозиторію через GitHub API
- Генерація токенів підтвердження email та відписки
- Запис даних у БД (Prisma ORM)
- Публікація подій у RabbitMQ та обробка Saga-відповідей

**Ключові Endpoints:**

- `POST /api/subscriptions` – створення нової підписки
- `GET /api/subscriptions/confirm/:token` – підтвердження імейлу
- `GET /api/subscriptions/unsubscribe/:token` – відписка від сповіщень

### 3.2 Scanner Service

**Відповідальність:** перевіряє GitHub-репозиторії на наявність нових релізів і створює задачі для розсилки сповіщень.

**Основні функції сервісу:**

- Використовує періодичне планування (`croner`)
- Проходиться по всіх унікальних репозиторіях з підтвердженими підписками у базі
- Для кожного робить HTTP запит до `https://api.github.com/repos/{owner}/{repo}/releases/latest`
- Порівнює отриманий тег із збереженим `last_seen_tag`
- Якщо є новий реліз:
  1. Знаходить всіх підтверджених користувачів для цього репозиторію
  2. Публікує повідомлення `release-notification` у RabbitMQ
  3. Оновлює `last_seen_tag` у базі

### 3.3 Notification Service

**Відповідальність:** виконує перевірку email через gRPC, обробляє email-повідомлення з RabbitMQ та відправляє листи користувачам.

**Основні функції сервісу:**

- Надає gRPC endpoint `verifyEmail` для перевірки одноразових email-доменів та синтаксису
- Слухає RabbitMQ черги для подій `confirmation-email` та `release-notification`
- Формує HTML-тіло листа
- Викликає Resend API для фактичної відправки листа користувачу
- Відправляє `saga-reply` у RabbitMQ для координації статусу підписки з API Service

### 3.4 Database (PostgreSQL + Prisma)

**Схема даних:**

```mermaid
erDiagram
    Repository {
        String id PK
        String owner
        String name
        String lastSeenTag
    }
    Subscriber {
        String id PK
        String email UK
    }
    Subscription {
        String id PK
        String repositoryId FK
        String subscriberId FK
        Boolean isConfirmed
        String confirmToken UK
        String unsubscribeToken UK
    }

    Repository ||--o{ Subscription : "has"
    Subscriber ||--o{ Subscription : "has"
```

**Обмеження цілісності:**

- `Subscriber.email` є унікальним, щоб один email відповідав одному підписнику.
- Пара `Repository.owner + Repository.name` є унікальною, щоб не дублювати один і той самий репозиторій.
- Пара `Subscription.subscriberId + Subscription.repositoryId` є унікальною, щоб користувач не міг мати дубльовану підписку на той самий репозиторій.
- `confirmToken` та `unsubscribeToken` є унікальними, оскільки використовуються для підтвердження підписки та відписки.
- При видаленні підписника або репозиторію пов’язані підписки видаляються каскадно.

## 4. Key Flows

### 4.1 Subscription Flow

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

### 4.2 Release Scan & Notification Flow

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

### 4.3 Unsubscribe Flow

```mermaid
sequenceDiagram
    actor User
    participant API
    participant DB as PostgreSQL

    Note over User: Clicks unsubscribe link from release email

    User->>API: GET /api/unsubscribe/{token}

    API->>DB: remove subscription by token

    alt Success
        DB-->>API: subscription removed
        API-->>User: 200 OK
    else Token not found
        API-->>User: 404 Not Found
    end
```
