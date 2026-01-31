# Life Assistant - Claude Code Context

**Last Updated**: January 2026
**Main Branch**: `main` (production) | **Staging Branch**: `staging`

## Project Overview

Life Assistant is a personal life automation platform. The first implemented feature is bidirectional task synchronization between Wrike (work) and ClickUp (personal), allowing work tasks to automatically appear in a personal task manager.

**Vision**: A unified automation hub for personal productivity - task sync is just the beginning. Future modules may include calendar integration, habit tracking, automated reminders, and more.

**Tech Stack**: NestJS, TypeORM, PostgreSQL 18, Docker, React, Vite, TanStack Router, Tailwind CSS

## Branching Strategy

```
main (stable/production)
  │
  ├──► feature-branch ──┬──► PR to staging (test)
  │                     │
  │                     └──► PR to main (promote)
  │
  └──► staging (unstable/testing)
```

**Rules:**
1. **Always branch off `main`** - it's the stable base
2. **PR to `staging` first** - test features in the unstable environment
3. **PR from feature branch to `main`** - promote tested features to production (NOT staging → main)
4. **Merge `main` → `staging`** - occasionally reset staging to stable state

**Branch purposes:**
- `main` - Production deployments, stable code only
- `staging` - Testing deployments, can be unstable
- Feature branches - Short-lived, deleted after merging to main

## Architecture

```
life-assistant/
├── life-assistant-api/          # NestJS backend
│   ├── src/
│   │   ├── auth/               # JWT authentication
│   │   ├── wrike/              # Wrike API integration
│   │   ├── clickup/            # ClickUp API integration
│   │   ├── webhooks/           # Webhook handlers + status monitoring
│   │   ├── sync/               # Sync orchestration logic
│   │   ├── database/           # TypeORM entities & migrations
│   │   └── commands/           # CLI commands (seed-user)
│   ├── Dockerfile              # Multi-stage production build
│   └── package.json
├── life-assistant-frontend/     # React frontend
│   ├── src/
│   │   ├── routes/             # TanStack Router file-based routes
│   │   ├── components/         # Reusable components
│   │   ├── contexts/           # React contexts (AuthContext)
│   │   └── lib/                # API client, utilities
│   ├── Dockerfile              # Multi-stage build (Node + nginx)
│   └── package.json
├── deployment/                  # Docker Compose for prod/staging
├── docker-compose.yml          # Development environment
└── DEPLOYMENT.md               # Production deployment guide
```

## Key Modules

### 1. Auth Module (`src/auth/`)
- **AuthService**: User validation, JWT token generation, password hashing
- **AuthController**: `POST /auth/login`, `GET /auth/me` endpoints
- **JwtStrategy**: Passport.js JWT strategy for token validation
- **JwtAuthGuard**: Protects routes requiring authentication
- **CurrentUser decorator**: Extracts user from request

### 2. Wrike Module (`src/wrike/`)
- **WrikeService**: API client with cached user ID (initialized on module startup)
- **WrikeController**: Test endpoints for manual API testing
- **Types**: TypeScript definitions in `types/wrike-api.types.ts`

### 3. ClickUp Module (`src/clickup/`)
- **ClickUpService**: API client with cached user/workspace IDs
- Similar structure to Wrike module

### 4. Webhooks Module (`src/webhooks/`)
- **WebhooksController**:
  - `POST /webhooks/wrike` - Handles Wrike webhook events
  - `POST /webhooks/clickup` - Handles ClickUp webhook events
  - `GET /webhooks/status` - Returns status of all registered webhooks (protected)
  - `DELETE /webhooks/:source/:id` - Deletes a webhook (protected)
- **WebhooksService**: Processes webhook events, aggregates webhook status

### 5. Sync Module (`src/sync/`)
- **SyncService**: Orchestrates bidirectional sync between platforms
  - `syncWrikeToClickUp()`: Creates/updates ClickUp tasks
  - `syncClickUpToWrike()`: Updates Wrike tasks (no creation)
  - `deleteTaskFromClickUp()`: Deletes ClickUp tasks when Wrike assignment removed
  - Status mapping with cached workflow data

### 6. Database Module (`src/database/`)
- **Entities**:
  - `User`: Single user for authentication
  - `TaskMapping`: Links Wrike tasks to ClickUp tasks
  - `SyncLog`: Audit trail of all sync operations
- **Migrations**: TypeORM migrations in `migrations/`

### 7. Frontend (`life-assistant-frontend/`)
- **Routes**: TanStack Router file-based routing
  - `/login` - Login page
  - `/` - Home (protected)
  - `/webhooks` - Webhook status monitoring (protected)
- **AuthContext**: Manages JWT token storage and auth state
- **ProtectedRoute**: HOC to guard authenticated routes
- **API client**: Axios with JWT interceptor

## Critical Implementation Details

### Status Mapping
Both platforms use custom statuses. The sync service loads and caches status workflows on first use:
- Wrike: `customStatusId` → status name mapping
- ClickUp: Lowercase status name → actual status name mapping
- Case-insensitive matching between platforms

### Task Assignment Logic
- **Wrike → ClickUp**: Auto-assigns to current user on creation/update
- **User removed from Wrike task**: Deletes corresponding ClickUp task
- User IDs cached during module initialization (`onModuleInit`)

### Date Handling
- **Wrike**: ISO 8601 strings without 'Z' (e.g., `2024-01-01T12:00:00`)
- **ClickUp**: Unix timestamp in milliseconds as string
- Conversion happens in sync service

### Webhook Security
- **Wrike**: X-Hook-Secret header verification
- **ClickUp**: X-Signature header with HMAC-SHA256

## Environment Variables

Required in `.env` (see `.env.example`):
```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=life_assistant

# API Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# JWT Authentication
JWT_SECRET=your_jwt_secret_change_in_production
JWT_EXPIRATION=7d

# Integrations
WRIKE_TOKEN=your_wrike_token
CLICKUP_TOKEN=your_clickup_token
CLICKUP_WORKSPACE_ID=your_workspace_id
CLICKUP_LIST_ID=your_list_id
```

Frontend environment (built into the app at build time):
```bash
VITE_API_URL=http://localhost:3000  # API base URL
```

## Common Development Commands

```bash
# Start database (Docker)
docker compose up -d

# Start API (in life-assistant-api/)
npm run start:dev

# Start frontend (in life-assistant-frontend/)
npm run dev

# Run migrations (in life-assistant-api/)
npm run migration:run

# Generate new migration
npm run migration:generate -- src/database/migrations/MigrationName

# Seed a user (development)
npm run seed:user -- --email=you@example.com --password=yourpassword

# Seed a user (production container)
docker compose exec api npm run seed:user:prod -- --email=you@example.com --password=yourpassword

# Test login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'
```

## Important Patterns

1. **Logging**: All services use NestJS Logger with context
2. **Error Handling**: Errors logged to SyncLog with status='failed'
3. **Service Caching**: User IDs and statuses cached in memory (cleared on restart)
4. **Repository Pattern**: TypeORM repositories injected via `@InjectRepository`
5. **Module Lifecycle**: Critical initialization in `onModuleInit` hooks

## Known Gotchas

1. **Wrike Status Parameter**: Use `customStatus` (not `customStatusId`) when updating tasks
2. **Service Initialization**: User ID fetch can fail on startup - check logs
3. **Webhook URLs**: Must be publicly accessible (use ngrok for dev)
4. **ClickUp List ID**: Required for all task operations, not workspace ID
5. **Date Precision**: Always use `.toString()` on Unix timestamps for ClickUp
6. **Wrike Webhooks**: Tend to go inactive/suspended - check status regularly
7. **CORS**: API needs `CORS_ORIGIN` set to frontend URL in production
8. **Password Special Characters**: When seeding users via CLI, special characters (`!$'"`) need shell escaping or use single quotes
9. **Frontend API URL**: `VITE_API_URL` is baked in at build time, not runtime

## Current State

### Task Sync Module (Complete)
- ✅ Wrike → ClickUp sync (create, update, delete)
- ✅ ClickUp → Wrike sync (disabled, was causing issues)
- ✅ Webhook handlers with signature verification
- ✅ Tag-based sync loop prevention (`synced-from-wrike` tag)
- ✅ Status mapping with caching (case-insensitive matching)
- ✅ Date sync (due dates, start dates)
- ✅ Auto-assignment to current user

### Authentication (Complete)
- ✅ Single-user JWT authentication
- ✅ Login endpoint with bcrypt password verification
- ✅ Protected routes with JwtAuthGuard
- ✅ User seeding CLI command

### Frontend (Complete)
- ✅ React + Vite + TanStack Router
- ✅ Tailwind CSS styling
- ✅ Login page with auth flow
- ✅ Protected routes
- ✅ Webhook status monitoring page

### Infrastructure
- ✅ Database entities and migrations (User, TaskMapping, SyncLog)
- ✅ Docker development environment
- ✅ CI/CD via GitHub Actions (builds both API and frontend)
- ✅ Staging deployment
  - API: `staging.life-assistant-api.waffleruntime.com`
  - Frontend: `staging.life-assistant.waffleruntime.com`
- ✅ Production deployment
  - API: `life-assistant-api.waffleruntime.com`
  - Frontend: `life-assistant.waffleruntime.com`

### Not Yet Implemented
- ❌ Additional automation modules (meal prep, habits, etc.)
- ❌ Webhook auto-recovery (re-register when suspended)
- ❌ CI/CD: Auto-sync docker-compose.yml to server (currently manual copy required)
- ❌ Health endpoint for API (`/health`)

## Testing Workflow

1. Start services: `docker compose up -d`
2. Check logs: `docker logs -f life-assistant-api`
3. For local webhook testing, use ngrok: `ngrok http 3000`
4. Setup webhooks using test endpoints
5. Trigger events in Wrike/ClickUp
6. Verify sync in opposite platform
7. Check sync_logs table for audit trail
