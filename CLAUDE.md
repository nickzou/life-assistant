# Life Assistant - Claude Code Context

**Last Updated**: January 2026
**Main Branch**: `main` (production) | **Staging Branch**: `staging`

## Project Overview

Life Assistant is a personal life automation platform. The first implemented feature is bidirectional task synchronization between Wrike (work) and ClickUp (personal), allowing work tasks to automatically appear in a personal task manager.

**Vision**: A unified automation hub for personal productivity - task sync is just the beginning. Future modules may include calendar integration, habit tracking, automated reminders, and more.

**Tech Stack**: NestJS, TypeORM, PostgreSQL 18, Docker

## Architecture

```
life-assistant/
├── life-assistant-api/          # NestJS application
│   ├── src/
│   │   ├── wrike/              # Wrike API integration
│   │   ├── clickup/            # ClickUp API integration
│   │   ├── webhooks/           # Webhook handlers (Wrike & ClickUp)
│   │   ├── sync/               # Sync orchestration logic
│   │   └── database/           # TypeORM entities & migrations
│   ├── Dockerfile              # Multi-stage production build
│   └── package.json
├── docker-compose.yml          # Development environment
└── DEPLOYMENT.md               # Production deployment guide
```

## Key Modules

### 1. Wrike Module (`src/wrike/`)
- **WrikeService**: API client with cached user ID (initialized on module startup)
- **WrikeController**: Test endpoints for manual API testing
- **Types**: TypeScript definitions in `types/wrike-api.types.ts`

### 2. ClickUp Module (`src/clickup/`)
- **ClickUpService**: API client with cached user/workspace IDs
- Similar structure to Wrike module

### 3. Webhooks Module (`src/webhooks/`)
- **WrikeWebhookController**: Handles Wrike webhook events (task created/updated/deleted/assigned)
- **ClickUpWebhookController**: Handles ClickUp webhook events (task updated/status changed)
- Both use signature verification for security

### 4. Sync Module (`src/sync/`)
- **SyncService**: Orchestrates bidirectional sync between platforms
  - `syncWrikeToClickUp()`: Creates/updates ClickUp tasks
  - `syncClickUpToWrike()`: Updates Wrike tasks (no creation)
  - `deleteTaskFromClickUp()`: Deletes ClickUp tasks when Wrike assignment removed
  - Status mapping with cached workflow data

### 5. Database Module (`src/database/`)
- **Entities**:
  - `TaskMapping`: Links Wrike tasks to ClickUp tasks
  - `SyncLog`: Audit trail of all sync operations
- **Migrations**: TypeORM migrations in `migrations/`

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

# Integrations
WRIKE_TOKEN=your_wrike_token
CLICKUP_TOKEN=your_clickup_token
CLICKUP_WORKSPACE_ID=your_workspace_id
CLICKUP_LIST_ID=your_list_id
```

## Common Development Commands

```bash
# Start development environment
docker compose up -d

# Run migrations
npm run migration:run

# Generate new migration
npm run migration:generate -- src/database/migrations/MigrationName

# Test Wrike API
curl http://localhost:3000/wrike/test/me

# Test ClickUp API
curl http://localhost:3000/clickup/test/me
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

## Current State

### Task Sync Module (Complete)
- ✅ Wrike → ClickUp sync (create, update, delete)
- ✅ ClickUp → Wrike sync (update only, no creation)
- ✅ Webhook handlers with signature verification
- ✅ Tag-based sync loop prevention (`synced-from-wrike` tag)
- ✅ Status mapping with caching (case-insensitive matching)
- ✅ Date sync (due dates, start dates)
- ✅ Auto-assignment to current user

### Infrastructure
- ✅ Database entities and migrations (TaskMapping, SyncLog)
- ✅ Docker development environment
- ✅ CI/CD via GitHub Actions
- ✅ Staging deployment (`staging.life-assistant-api.waffleruntime.com`)
- ⏳ Production deployment (infrastructure ready, pending promotion)

### Not Yet Implemented
- ❌ REST API for frontend
- ❌ React frontend (for custom quick views and automation triggers, not task management - ClickUp handles that)
- ❌ Authentication module (JWT)
- ❌ Additional automation modules (meal prep, habits, etc.)

## Testing Workflow

1. Start services: `docker compose up -d`
2. Check logs: `docker logs -f life-assistant-api`
3. For local webhook testing, use ngrok: `ngrok http 3000`
4. Setup webhooks using test endpoints
5. Trigger events in Wrike/ClickUp
6. Verify sync in opposite platform
7. Check sync_logs table for audit trail
