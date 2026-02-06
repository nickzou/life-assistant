# Life Assistant - Claude Code Context

**Last Updated**: February 2026
**Main Branch**: `main` (production)

## Project Overview

Life Assistant is a personal life automation platform with unified task aggregation across Wrike (work) and ClickUp (personal), plus integrations like Grocy for meal prep automation.

**Vision**: A unified automation hub for personal productivity - task sync is just the beginning. Future modules may include calendar integration, habit tracking, automated reminders, and more.

**Tech Stack**: NestJS, TypeORM, PostgreSQL 18, Docker, React, Vite, TanStack Router, Tailwind CSS

## Branching Strategy

```
main (stable/production)
  │
  └──► feature-branch ──► PR to main
```

**Rules:**
1. **Always branch off `main`** - it's the stable base
2. **PR directly to `main`** - all PRs target main by default
3. **Deploy to staging via GitHub UI** - use workflow dispatch to test before merging
4. **Merge to `main`** - triggers automatic production deployment

**Staging Deployment:**
- Go to Actions → Deploy → Run workflow
- Select the feature branch to deploy to staging
- Test at `staging.life-assistant.waffleruntime.com`

**Branch purposes:**
- `main` - Production deployments, stable code only
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
  - `POST /webhooks/wrike` - Stub endpoint (sync removed, prevents 404s from registered webhooks)
  - `POST /webhooks/clickup` - Handles ClickUp webhook events (Grocy integration)
  - `GET /webhooks/status` - Returns status of all registered webhooks (protected)
  - `DELETE /webhooks/:source/:id` - Deletes a webhook (protected)
- **WebhooksService**: Aggregates webhook status from Wrike and ClickUp
- **ClickUpWebhookHandlerService**: Handles ClickUp events for Grocy integration

### 5. Database Module (`src/database/`)
- **Entities**:
  - `User`: Single user for authentication
  - `TaskMapping`: Historical Wrike↔ClickUp mappings (retained, no active writes)
  - `SyncLog`: Historical sync audit trail (retained, no active writes)
- **Migrations**: TypeORM migrations in `migrations/`

### 6. Frontend (`life-assistant-frontend/`)
- **Routes**: TanStack Router file-based routing
  - `/login` - Login page
  - `/` - Home (protected)
  - `/webhooks` - Webhook status monitoring and registration (protected)
- **AuthContext**: Manages JWT token storage and auth state
- **ProtectedRoute**: HOC to guard authenticated routes
- **API client**: Axios with JWT interceptor
- **Webhook Management UI**: Register/delete webhooks for Wrike or ClickUp from the `/webhooks` page

## Critical Implementation Details

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
2. **Error Handling**: Services log errors via NestJS Logger
3. **Service Caching**: User IDs cached in memory (cleared on restart)
4. **Repository Pattern**: TypeORM repositories injected via `@InjectRepository`
5. **Module Lifecycle**: Critical initialization in `onModuleInit` hooks

## Known Gotchas

1. **Service Initialization**: User ID fetch can fail on startup - check logs
2. **Webhook URLs**: Must be publicly accessible (use ngrok for dev)
3. **ClickUp List ID**: Required for all task operations, not workspace ID
4. **Wrike Webhooks**: Tend to go inactive/suspended - check status regularly
5. **CORS**: API needs `CORS_ORIGIN` set to frontend URL in production
6. **Password Special Characters**: When seeding users via CLI, special characters (`!$'"`) need shell escaping or use single quotes
7. **Frontend API URL**: `VITE_API_URL` is baked in at build time, not runtime
8. **Zoxide cd alias**: User has `cd` aliased to zoxide's `z` command. This doesn't work in non-interactive shells (like Claude Code's Bash tool), causing `cd:1: command not found: __zoxide_z` errors. Use absolute paths or wrap in `bash -c 'cd "..." && ...'` when directory changes are needed.

## Current State

### Task Aggregation
- ✅ Unified task view aggregating from Wrike and ClickUp APIs directly
- ✅ Wrike→ClickUp bidirectional sync removed (was redundant with direct aggregation)
- ✅ Historical `task_mappings` and `sync_logs` tables retained in database

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
- ✅ Database entities and migrations (User, TaskMapping*, SyncLog*) (*historical, no active writes)
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
5. Trigger events in ClickUp
6. Verify Grocy integration behavior
