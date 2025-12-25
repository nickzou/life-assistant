# Life Assistant - Design Documentation

## Overview

A unified task management platform that integrates multiple productivity tools (starting with Wrike ↔ ClickUp sync) with a custom frontend for simplified task management. Built with TypeScript, NestJS, PostgreSQL, and React for scalable multi-service deployment on a VPS.

## Problem Statement

- **Work tasks** are managed in Wrike (company requirement)
- **Personal productivity** is managed in ClickUp (personal preference)
- Need to maintain visibility across both platforms without manual duplication
- Changes in either platform should automatically reflect in the other
- **Future needs:**
  - Multiple integrations beyond Wrike-ClickUp (Jira, Asana, Notion, etc.)
  - Custom frontend for simplified task views and updates
  - User authentication for secure access
  - Analytics and reporting across all platforms

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                     (React Frontend)                        │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
                         │ (JWT Auth)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    NestJS Backend                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    API Module                        │   │
│  │  - Authentication (JWT)                              │   │
│  │  - REST endpoints for frontend                       │   │
│  │  - Task queries & manual operations                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Wrike      │  │   ClickUp    │  │   Future     │      │
│  │   Module     │  │   Module     │  │   Modules    │      │
│  │              │  │              │  │   (Jira,     │      │
│  │ - Webhooks   │  │ - Webhooks   │  │   Asana...)  │      │
│  │ - API Client │  │ - API Client │  │              │      │
│  │ - Sync Logic │  │ - Sync Logic │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
│         └──────────────────┴─────────────┐                  │
│                                           ↓                  │
│         ┌─────────────────────────────────────────┐         │
│         │         Database Module                 │         │
│         │    - Task Mappings                      │         │
│         │    - Sync History                       │         │
│         │    - User Settings                      │         │
│         └─────────────────┬───────────────────────┘         │
└───────────────────────────┼─────────────────────────────────┘
                            ↓
                  ┌───────────────────┐
                  │   PostgreSQL      │
                  │   - task_mappings │
                  │   - sync_logs     │
                  │   - users         │
                  └───────────────────┘

External APIs:
Wrike ────Webhooks────> NestJS
ClickUp ──Webhooks────> NestJS
```

### Tech Stack Rationale

**TypeScript**
- Full type safety catches bugs at compile time
- Better IDE support and autocomplete
- Self-documenting code through types
- Easier refactoring and maintenance
- Shared types between frontend and backend

**NestJS (Backend Framework)**
- Built-in modular architecture (perfect for multiple integrations)
- Dependency injection for testability
- Decorators for clean, declarative code
- First-class TypeScript support
- Microservices-ready if needed later
- Built-in support for authentication, validation, scheduling
- TypeORM integration for type-safe database queries
- Extensive documentation and ecosystem

**PostgreSQL**
- Supports concurrent connections from multiple services
- ACID compliance for data integrity
- JSON/JSONB columns for flexible task metadata
- Full-text search capabilities
- Triggers and functions for complex logic
- Can scale from single VPS to distributed setup
- Free and open-source
- Production-proven reliability

**React (Frontend)**
- Component-based architecture
- Large ecosystem of UI libraries (Material-UI, Ant Design, etc.)
- Excellent developer experience with hot reload
- TypeScript support for type-safe frontend
- Can be deployed as static files (easy hosting)
- Server-side rendering possible with Next.js later

**PM2**
- Process management and auto-restart
- Built-in logging with rotation
- Zero-downtime restarts
- Resource monitoring
- Startup script generation

**VPS Deployment**
- Cost-effective (~$5-10/month vs $50+/month for serverless)
- Full control over resources
- No cold starts
- Predictable costs
- Can run 24/7

## Core Components

### 1. Wrike Module (`src/wrike/`)

**WrikeService** (`wrike.service.ts`)
- Injectable NestJS service
- Wraps Wrike REST API v4
- Methods: `getTask()`, `createTask()`, `updateTask()`
- Handles authentication via Bearer token
- Returns typed responses

**WrikeController** (`wrike.controller.ts`)
- Handles webhook endpoints: `POST /webhooks/wrike`
- Validates webhook signatures
- Delegates to WrikeService and SyncService

**WrikeModule** (`wrike.module.ts`)
- Exports WrikeService for use by other modules
- Imports DatabaseModule for task mappings

### 2. ClickUp Module (`src/clickup/`)

**ClickUpService** (`clickup.service.ts`)
- Injectable NestJS service
- Wraps ClickUp API v2
- Methods: `getTask()`, `createTask()`, `updateTask()`
- Handles authentication via API token
- Returns typed responses

**ClickUpController** (`clickup.controller.ts`)
- Handles webhook endpoints: `POST /webhooks/clickup`
- Validates webhook signatures
- Delegates to ClickUpService and SyncService

**ClickUpModule** (`clickup.module.ts`)
- Exports ClickUpService for use by other modules
- Imports DatabaseModule for task mappings

**Design Decision:** Each integration as a separate NestJS module
- Clear module boundaries
- Easy to add new integrations
- Modules can be tested in isolation
- Services are injectable and mockable

### 3. Database Module (`src/database/`)

**Entities (TypeORM):**

```typescript
// task-mapping.entity.ts
@Entity('task_mappings')
export class TaskMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  wrike_id: string;

  @Column({ unique: true })
  clickup_id: string;

  @Column()
  integration_type: string; // 'wrike-clickup', 'jira-clickup', etc.

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Index()
  @Column({ nullable: true })
  user_id: string; // For multi-user support
}

// sync-log.entity.ts
@Entity('sync_logs')
export class SyncLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  source_platform: string;

  @Column()
  target_platform: string;

  @Column()
  source_task_id: string;

  @Column()
  target_task_id: string;

  @Column()
  action: string; // 'create', 'update', 'delete'

  @Column()
  status: string; // 'success', 'failed'

  @Column('text', { nullable: true })
  error_message: string;

  @CreateDateColumn()
  created_at: Date;
}

// user.entity.ts (for future multi-user support)
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ nullable: true })
  wrike_token: string;

  @Column({ nullable: true })
  clickup_token: string;

  @CreateDateColumn()
  created_at: Date;
}
```

**DatabaseService** (`database.service.ts`)
- Injectable service wrapping TypeORM repositories
- Methods: `saveMapping()`, `getMapping()`, `findMappingByWrikeId()`, `findMappingByClickUpId()`
- Handles all database operations
- Returns typed entities

**DatabaseModule** (`database.module.ts`)
- Configures TypeORM connection
- Exports repositories for injection
- Handles migrations

**Design Decision:** TypeORM with PostgreSQL
- Type-safe database queries
- Automatic schema migrations
- Supports concurrent access from multiple services
- Can add indexes for performance
- Supports complex queries for analytics
- No in-memory cache needed (PostgreSQL is fast enough)

**Why PostgreSQL:**
- Multiple services can connect simultaneously (frontend + backend)
- Battle-tested for production workloads
- JSONB columns for flexible metadata storage
- Full-text search for task descriptions
- Can scale beyond single server if needed
- Free and open-source

### 4. Sync Module (`src/sync/`)

**SyncService** (`sync.service.ts`)
- Injectable NestJS service
- Orchestrates the sync logic
- Methods: `syncWrikeToClickUp()`, `syncClickUpToWrike()`, `manualSync()`
- Handles create vs update logic
- Manages mapping storage via DatabaseService
- Logs all sync operations to SyncLog table

**Sync Flow:**

1. Receive task ID from webhook or manual trigger
2. Fetch full task details from source API
3. Check database for existing mapping
4. If mapping exists → Update existing task
5. If no mapping → Create new task and save mapping
6. Log sync operation (success or failure)
7. Return success/failure

**Design Decision:** Separate sync module
- Isolates business logic from API and presentation layers
- Injectable service can be used by webhooks and REST API
- Easier to test in isolation
- Can be reused across different integrations

### 5. API Module (`src/api/`)

**Purpose:** REST API for the React frontend

**ApiController** (`api.controller.ts`)
```typescript
// Task Management
GET    /api/tasks                 // List all synced tasks
GET    /api/tasks/:id             // Get specific task details
GET    /api/tasks/:id/status      // Get sync status
POST   /api/tasks/sync            // Manually trigger sync
DELETE /api/tasks/:id/mapping     // Remove task mapping

// Analytics
GET    /api/stats                 // Sync statistics
GET    /api/sync-logs             // Recent sync history
GET    /api/sync-logs/:id         // Specific sync log

// Integration Management
GET    /api/integrations          // List active integrations
GET    /api/integrations/:type/status // Integration health

// User Management (future)
GET    /api/user/profile          // Get user profile
PUT    /api/user/tokens           // Update API tokens
```

**AuthGuard**
- JWT-based authentication
- Validates tokens on all API endpoints
- Extracts user_id for multi-user support

**Design Decision:** Separate API module
- Clean separation between webhooks and REST endpoints
- Easy to version API (v1, v2, etc.)
- Can add rate limiting per user
- OpenAPI/Swagger documentation auto-generated

### 6. Status Mapping (`src/common/utils/`)

**Challenge:** Different status systems
- Wrike: Active, Completed, Deferred, Cancelled
- ClickUp: User-defined statuses (to do, in progress, complete, etc.)

**Solution:** Mapping functions
```typescript
mapWrikeStatusToClickUp(wrikeStatus) → clickupStatus
mapClickUpStatusToWrike(clickupStatus) → wrikeStatus
```

**Mapping Strategy:**
- Active → "in progress"
- Completed → "complete"
- Deferred → "blocked"
- Cancelled → "closed"
- Reverse mapping uses string matching (includes 'complete', 'progress', etc.)

### 7. Configuration Module (`src/config/`)

**Environment Variables:**
```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=life_assistant

# Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=7d

# Wrike Integration
WRIKE_TOKEN=your_wrike_token
WRIKE_FOLDER_ID=folder_id_to_sync

# ClickUp Integration
CLICKUP_TOKEN=your_clickup_token
CLICKUP_LIST_ID=list_id_to_sync

# Server
PORT=3000
NODE_ENV=development
```

**ConfigService** (using @nestjs/config)
- Type-safe configuration access
- Validates all required variables on startup
- Supports .env files
- Can override with environment variables

**Design Decision:** NestJS ConfigModule
- Fails fast if configuration is missing
- Type-safe configuration getters
- Easy to test with different configs
- Supports multiple environments (dev, staging, prod)

### 8. Type Definitions (`src/common/types/`)

**Shared types between backend and frontend:**
- `task.types.ts` - Task entities and DTOs
- `sync.types.ts` - Sync log types
- `api.types.ts` - API request/response types
- `integration.types.ts` - Integration-specific types

**Complete type coverage for:**
- Wrike API responses
- ClickUp API responses
- Webhook event payloads
- Database entities
- REST API endpoints (auto-generated DTOs)
- Configuration

**Design Decision:** Centralized types + DTOs
- Single source of truth
- Can be shared with frontend via npm package or monorepo
- Easy to update when APIs change
- Enables IntelliSense across entire codebase
- NestJS auto-validates DTOs with class-validator

## Webhook Flow

### Wrike Webhook (`POST /webhooks/wrike`)

```typescript
@Controller('webhooks')
export class WrikeController {
  @Post('wrike')
  async handleWrikeWebhook(@Body() payload: WrikeWebhookDto) {
    // 1. Validate webhook signature
    // 2. Extract taskId and eventType
    // 3. Filter for relevant events:
    //    - TaskCreated, TaskStatusChanged, TaskTitleChanged, TaskDescriptionChanged
    // 4. Check if event was triggered by sync bot (prevent loops)
    // 5. Call syncService.syncWrikeToClickUp(taskId)
    // 6. Return success response
  }
}
```

### ClickUp Webhook (`POST /webhooks/clickup`)

```typescript
@Controller('webhooks')
export class ClickUpController {
  @Post('clickup')
  async handleClickUpWebhook(@Body() payload: ClickUpWebhookDto) {
    // 1. Validate webhook signature
    // 2. Extract task_id and event type
    // 3. Filter for relevant events:
    //    - taskCreated, taskUpdated, taskStatusUpdated
    // 4. Check if event was triggered by sync bot (prevent loops)
    // 5. Call syncService.syncClickUpToWrike(taskId)
    // 6. Return success response
  }
}
```

## Data Flow

### Creating a Task (Wrike → ClickUp)

```
1. User creates task in Wrike
2. Wrike sends webhook to /webhook/wrike
3. Server fetches full task details from Wrike API
4. Server checks database for existing mapping → None found
5. Server creates new task in ClickUp via API
6. Server saves mapping: wrike_id → clickup_id
7. Done! Future updates will modify existing task
```

### Updating a Task (ClickUp → Wrike)

```
1. User updates task in ClickUp
2. ClickUp sends webhook to /webhook/clickup
3. Server fetches full task details from ClickUp API
4. Server checks database for existing mapping → Found!
5. Server updates existing Wrike task via API
6. Done! Mapping already exists
```

## Avoiding Sync Loops

**Problem:** Updates trigger webhooks, which trigger updates, creating infinite loops

**Solution:** Event filtering
- Track if event was triggered by the sync service
- Ignore events with `eventAuthorId === 'sync_bot'` (Wrike)
- Ignore events with `username === 'sync_bot'` (ClickUp)

**Note:** Currently relies on simple checks. Could be enhanced with:
- Tracking recent sync operations
- Adding sync metadata to task descriptions
- Implementing cooldown periods

## Error Handling

**API Failures:**
- Log error with context
- Return null from API methods
- Continue processing other events
- Don't crash the server

**Database Failures:**
- Log error
- Return false from operations
- Server continues running
- Mappings may be lost (but can be manually recreated)

**Webhook Processing:**
- Catch all errors in endpoint handlers
- Return 500 status with error message
- Log full error details
- Prevent server crashes

## Deployment Architecture

```
Internet
   │
   ├─── HTTPS (Port 443)
   │
Nginx Reverse Proxy
   │
   ├─── /api/* ──────> HTTP (Port 3000) ──> NestJS Backend
   │                                          ├─── Webhooks
   │                                          ├─── REST API
   │                                          └─── Integrations
   │
   ├─── /* ──────────> HTTP (Port 3001) ──> React Frontend (dev)
   │                   Static Files (prod)
   │
   └─── PostgreSQL (Port 5432, internal)
        ├─── task_mappings
        ├─── sync_logs
        └─── users
```

**Production Setup:**

```
┌─────────────────────────────────────────────────┐
│                    VPS Server                    │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Nginx (Port 80/443)                       │ │
│  │  - SSL termination (Let's Encrypt)         │ │
│  │  - Reverse proxy                           │ │
│  │  - Static file serving (React build)       │ │
│  │  - Rate limiting                            │ │
│  └──────────┬─────────────────────────────────┘ │
│             │                                    │
│  ┌──────────┴───────────────┬─────────────────┐ │
│  │                          │                 │ │
│  │  PM2 (Backend)           │  PostgreSQL     │ │
│  │  ├─ NestJS (Port 3000)   │  (Port 5432)    │ │
│  │  ├─ Auto-restart         │  - Persistence  │ │
│  │  └─ Log rotation         │  - Backups      │ │
│  │                          │                 │ │
│  └──────────────────────────┴─────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Components:**
- **Nginx**: SSL termination, reverse proxy, static file serving, rate limiting
- **PM2**: Process management for NestJS, auto-restart, logging
- **NestJS**: Backend API server (webhooks + REST)
- **PostgreSQL**: Database server (local on VPS)
- **React**: Frontend (built to static files, served by Nginx)

## Performance Considerations

**Memory Usage:**
- NestJS process: ~100-150MB base
- PostgreSQL: ~50-100MB for small datasets
- PM2 overhead: ~10MB
- React build: Static files (~2-5MB)
- Total: ~200-300MB (fits comfortably in 1GB VPS)

**Response Times:**
- Webhook receipt: <10ms
- Database lookup (PostgreSQL): <5ms with indexes
- API calls to external services: 100-500ms (network dependent)
- Frontend API queries: 10-50ms (database + serialization)
- Total sync time: ~200-600ms per task

**Scalability:**
- Single VPS handles 1000s of tasks easily
- PostgreSQL can handle 100s of concurrent connections
- Can scale vertically (more RAM/CPU) or horizontally (add read replicas)
- Bottleneck is API rate limits, not server capacity
- Can handle ~60-100 syncs/minute (conservative estimate)

**Database Performance:**
- Indexes on wrike_id, clickup_id, user_id
- Connection pooling (TypeORM default: 10 connections)
- Query result caching for frequent reads
- Automatic vacuuming for PostgreSQL maintenance

## Security

**Authentication & Authorization:**
- JWT tokens for frontend authentication
- Tokens expire after configurable period (default: 7 days)
- Passwords hashed with bcrypt (12 rounds)
- API endpoints protected with AuthGuard
- Role-based access control (future: admin vs user)

**API Tokens:**
- External API tokens (Wrike, ClickUp) stored in environment variables
- User-specific tokens stored encrypted in database
- Never logged or exposed in API responses
- Not committed to version control

**Webhooks:**
- Webhook signature verification (HMAC-SHA256)
- IP whitelisting for known webhook sources
- Rate limiting to prevent abuse
- HTTPS required in production

**Database:**
- TypeORM prevents SQL injection (parameterized queries)
- Database user has minimal required permissions
- Password complexity requirements
- Regular automated backups
- Encryption at rest (future enhancement)

**Frontend Security:**
- CORS configured for specific origin
- XSS prevention (React auto-escapes by default)
- CSRF tokens for state-changing operations
- Secure cookie flags (httpOnly, secure, sameSite)
- Content Security Policy headers

**Network Security:**
- Nginx rate limiting (100 req/min per IP)
- Fail2ban for brute force protection
- SSL/TLS with modern cipher suites
- HSTS headers
- Database not exposed to public internet

## Cost Analysis

**Monthly Costs:**
- VPS (DigitalOcean/Vultr 1GB RAM): $6-12
  - Includes: NestJS backend, PostgreSQL, Nginx
- Domain (optional): ~$1/month
- SSL Certificate: Free (Let's Encrypt)
- Wrike API: Free
- ClickUp API: Free
- PostgreSQL: Free (self-hosted on VPS)
- Frontend hosting: Free (static files on same VPS)

**Total: $6-12/month**

**Recommended VPS Specs:**
- **Development:** 1GB RAM, 1 CPU, 25GB SSD ($6/month)
- **Production:** 2GB RAM, 1 CPU, 50GB SSD ($12/month)
  - Handles more concurrent users
  - Better PostgreSQL performance
  - Room for growth

**vs. Alternatives:**
- Zapier: $20-50/month for premium features
- Make.com: $9-29/month
- Custom serverless (AWS Lambda + RDS): $30-50/month
- Heroku (with Postgres addon): $25-50/month
- Vercel + Supabase: $25-40/month

**Cost Savings:**
- ~50-75% cheaper than managed alternatives
- No per-execution costs
- Unlimited webhook calls
- No database row limits

## Future Enhancements

### Phase 1: Core Features (Current Focus)
- ✅ NestJS architecture with modular design
- ✅ PostgreSQL database with TypeORM
- ✅ REST API for frontend
- ✅ JWT authentication
- 🔨 React frontend for task management
- 🔨 Webhook signature verification
- 🔨 Basic sync logging and monitoring

### Phase 2: Enhanced Sync Features
- Retry logic for failed API calls with exponential backoff
- Support for syncing comments between platforms
- Support for file attachments
- Sync subtasks/checklist items
- Selective sync based on tags/labels
- Conflict resolution UI (when task updated in both platforms)
- Bidirectional sync for due dates and assignees

### Phase 3: Additional Integrations
- Jira ↔ ClickUp sync
- Asana ↔ ClickUp sync
- Notion ↔ ClickUp sync
- Generic webhook integration for custom apps
- Integration marketplace/plugin system

### Phase 4: Advanced Features
- Multi-user support (each user has their own integrations)
- Role-based access control (admin, user, viewer)
- GraphQL API for more flexible queries
- Real-time sync status dashboard (WebSockets)
- Mobile app (React Native)
- Analytics and reporting (tasks created, sync success rate, etc.)
- Bulk operations (sync all tasks, reset mappings, etc.)
- Custom field mapping configuration
- Scheduled syncs (not just webhook-driven)

## Project Structure

```
life-assistant/
├── backend/                    # NestJS application
│   ├── src/
│   │   ├── wrike/             # Wrike integration module
│   │   │   ├── wrike.service.ts
│   │   │   ├── wrike.controller.ts
│   │   │   ├── wrike.module.ts
│   │   │   └── dto/
│   │   ├── clickup/           # ClickUp integration module
│   │   │   ├── clickup.service.ts
│   │   │   ├── clickup.controller.ts
│   │   │   ├── clickup.module.ts
│   │   │   └── dto/
│   │   ├── sync/              # Sync orchestration
│   │   │   ├── sync.service.ts
│   │   │   └── sync.module.ts
│   │   ├── database/          # Database entities & module
│   │   │   ├── entities/
│   │   │   │   ├── task-mapping.entity.ts
│   │   │   │   ├── sync-log.entity.ts
│   │   │   │   └── user.entity.ts
│   │   │   ├── database.service.ts
│   │   │   └── database.module.ts
│   │   ├── api/               # REST API for frontend
│   │   │   ├── api.controller.ts
│   │   │   ├── api.service.ts
│   │   │   ├── api.module.ts
│   │   │   └── dto/
│   │   ├── auth/              # Authentication
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── guards/
│   │   │   └── strategies/
│   │   ├── common/            # Shared utilities
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   └── decorators/
│   │   ├── config/            # Configuration
│   │   │   └── config.module.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/          # API client
│   │   ├── hooks/
│   │   ├── types/             # Shared with backend
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                     # Shared types (optional)
│   └── types/
│
├── docs/
├── .env.example
└── README.md
```

## Testing Strategy

**Unit Tests (Jest + NestJS Testing):**
- Service methods (WrikeService, ClickUpService, SyncService)
  - Mock external API calls with axios-mock-adapter
  - Test error handling and retries
- Status mapping functions
- Database operations (using in-memory SQLite for tests)
- Authentication logic (JWT generation, validation)
- DTOs validation with class-validator

**Integration Tests:**
- Webhook endpoints (with realistic payloads)
  - Test Wrike webhook handling
  - Test ClickUp webhook handling
  - Test loop prevention
- API endpoints (with supertest)
  - Test authentication flow
  - Test task queries
  - Test manual sync triggers
- Full sync flow (end-to-end)
  - Use test API endpoints (mock servers)
  - Verify database state after sync

**E2E Tests (Frontend + Backend):**
- User login flow
- Task list display
- Manual sync trigger from UI
- Real-time sync status updates

**Manual Testing:**
- Create test tasks in Wrike → Verify in ClickUp
- Create test tasks in ClickUp → Verify in Wrike
- Update tasks in both platforms
- Test edge cases:
  - Long descriptions
  - Special characters
  - Multiple rapid updates
  - Network failures
  - Invalid tokens

**Test Coverage Goals:**
- Services: >80%
- Controllers: >70%
- Overall: >75%

## Monitoring & Maintenance

**Health Checks:**
- `GET /health` endpoint (NestJS TerminusModule)
  - Database connectivity
  - Memory usage
  - Disk space
  - Uptime
  - Last successful sync time
- Can be monitored by UptimeRobot, Pingdom, Better Uptime, etc.

**Logging:**
- NestJS built-in logger with custom formatting
- PM2 captures stdout/stderr
- Winston for structured logging (JSON format)
- Log levels: error, warn, info, debug
- Logs stored in `/var/log/life-assistant/`
- Automatic rotation via pm2-logrotate
- Retention: 7 days of detailed logs, 30 days of error logs

**Backups:**
- PostgreSQL automated backups via cron
  ```bash
  # Daily backup at 2 AM
  0 2 * * * pg_dump life_assistant > /backups/db_$(date +\%Y\%m\%d).sql
  ```
- Keep 7 days of daily backups
- Weekly backups retained for 30 days
- Backup to cloud storage (S3, Backblaze, etc.) for redundancy

**Metrics to Monitor:**
- Server uptime and availability
- API response times (p50, p95, p99)
- Webhook processing times
- Error rates (4xx, 5xx)
- Database query performance
- Database size and growth rate
- Memory usage and trends
- CPU usage
- Sync success/failure rates
- External API rate limit usage

**Alerting:**
- Server down for >5 minutes
- Error rate >5% over 10 minutes
- Database size >80% of disk
- Memory usage >90%
- Sync failures >10 in an hour
- External API errors (token expiration, rate limits)

## Design Decisions Summary

| Decision | Rationale |
|----------|-----------|
| **TypeScript** over JavaScript | Type safety, shared types between frontend/backend, better tooling |
| **NestJS** over Express | Built-in modularity, DI, microservices-ready, extensive ecosystem |
| **PostgreSQL** over SQLite | Multi-service access, scalability, better for production workloads |
| **TypeORM** over raw SQL | Type-safe queries, auto-migrations, entity modeling |
| **React** for frontend | Large ecosystem, TypeScript support, component reusability |
| **JWT** for auth | Stateless, scalable, standard for SPAs |
| **VPS** over Serverless | Cost-effective ($6-12 vs $30-50/mo), no cold starts, full control |
| **Webhooks** over Polling | Real-time, efficient, event-driven architecture |
| **Modular architecture** | Each integration is a module, easy to add new platforms |
| **PM2** over systemd | Easier management, built-in logging and monitoring |
| **Nginx** reverse proxy | SSL termination, static file serving, rate limiting |
| **Monorepo structure** | Shared types, unified versioning, simpler deployment |

## Conclusion

This design prioritizes:
- **Scalability** - Built with NestJS modules, easy to add new integrations
- **Maintainability** - Type-safe, well-structured, testable code
- **Cost-effectiveness** - $6-12/month VPS vs $30-50/month for managed alternatives
- **Extensibility** - Modular architecture allows adding features without rewrites
- **Production-ready** - Proper authentication, logging, monitoring, backups
- **User experience** - Custom React frontend for simplified task management
- **Type safety** - End-to-end TypeScript across frontend, backend, and database

The architecture starts with a solid foundation (NestJS + PostgreSQL) that can scale from a single integration to a full-featured task management platform with multiple integrations, users, and advanced features.

**Key advantages over initial Express + SQLite design:**
- ✅ Multi-service support (frontend can query database)
- ✅ Better scalability (PostgreSQL handles concurrent connections)
- ✅ Easier to test (dependency injection, mocking)
- ✅ Faster development (NestJS CLI, decorators, auto-validation)
- ✅ Better developer experience (IntelliSense, type safety everywhere)
- ✅ Production-ready from day one (authentication, proper logging)

**When to scale:**
- Add read replicas if database becomes bottleneck (>1000 users)
- Extract integration modules to separate microservices if needed
- Add Redis for caching and session management at scale
- Consider managed database (RDS, Supabase) if ops burden increases

This architecture avoids premature optimization while building on solid foundations that won't require major rewrites as the platform grows.
