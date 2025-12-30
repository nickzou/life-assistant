# Life Assistant - Design Documentation

## Implementation Status

**Last Updated:** December 29, 2025

**Current Phase:** Phase 1 - Backend Foundation (In Progress)

| Component | Status | Notes |
|-----------|--------|-------|
| **NestJS Backend** | ✅ Implemented | Modular architecture with ConfigModule |
| **Database Module** | ✅ Implemented | TypeORM entities for TaskMapping, SyncLog, User |
| **Wrike Module** | ✅ Implemented | API client with comprehensive types, test endpoints & user ID caching |
| **ClickUp Module** | ✅ Implemented | API client with comprehensive types & test endpoints |
| **Webhooks Module** | ✅ Implemented | Task filtering, sync integration, event processing |
| **Sync Module** | 🟡 Partial | Wrike → ClickUp sync working; reverse sync TODO |
| **API Module** | ❌ Not Started | REST API for frontend |
| **Auth Module** | ❌ Not Started | JWT authentication |
| **React Frontend** | ❌ Not Started | User interface |

**Next Steps:**
1. Implement ClickUp → Wrike reverse sync
2. Add status mapping utilities (Wrike ↔ ClickUp statuses)
3. Add webhook signature verification
4. Implement DTO validation and type definitions for webhook payloads
5. Create API Module for frontend

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
│  │                 Webhooks Module                      │   │
│  │  - POST /webhooks/wrike                              │   │
│  │  - POST /webhooks/clickup                            │   │
│  │  - Event payload logging                             │   │
│  │  - Webhook signature validation (TODO)               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Wrike      │  │   ClickUp    │  │   Future     │      │
│  │   Module     │  │   Module     │  │   Modules    │      │
│  │              │  │              │  │   (Jira,     │      │
│  │ - API Client │  │ - API Client │  │   Asana...)  │      │
│  │ - Test       │  │ - Test       │  │              │      │
│  │   Endpoints  │  │   Endpoints  │  │              │      │
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

**Implementation Status: ✅ Completed**

**WrikeService** (`wrike.service.ts`)
- Injectable NestJS service implementing OnModuleInit
- Wraps Wrike REST API v4
- **User ID Caching:**
  - Automatically fetches and caches current user ID on module initialization
  - `getCurrentUser()` - Fetch authenticated user contact information
  - `getCurrentUserId()` - Get cached user ID for task filtering
- **Task Methods:**
  - `getTask(taskId)` - Fetch specific task
  - `getTasksInFolder(folderId)` - List all tasks in folder
  - `getAllFolders()` - List all folders
  - `getCustomStatuses()` - Fetch custom workflow statuses
  - `createTask()`, `updateTask()` - (TODO: To be implemented)
- **Webhook Management:**
  - `createWebhook(hookUrl)` - Register a new webhook with Wrike
  - `listWebhooks()` - List all registered webhooks
  - `deleteWebhook(webhookId)` - Remove a webhook registration
- Handles authentication via Bearer token
- Returns typed responses using `WrikeApiResponse<T>` types

**WrikeController** (`wrike.controller.ts`)
- **Purpose:** Test/exploration and webhook management endpoints
- **Test Endpoints:**
  - `GET /wrike/test/statuses` - Fetch custom statuses
  - `GET /wrike/test/tasks` - List tasks in configured folder
  - `GET /wrike/test/task/:taskId` - Get specific task
  - `GET /wrike/test/folders` - List all folders
  - `GET /wrike/test/me` - Get current authenticated user info
- **Webhook Management Endpoints:**
  - `POST /wrike/webhooks/setup` - Auto-register webhook for current environment (supports ngrok)
  - `GET /wrike/webhooks` - List all registered webhooks
  - `DELETE /wrike/webhooks/:webhookId` - Delete a webhook
- Perfect for preview deployments and multi-environment setups

**WrikeModule** (`wrike.module.ts`)
- Exports WrikeService for use by other modules
- Imports ConfigModule for environment variables

### 2. ClickUp Module (`src/clickup/`)

**Implementation Status: ✅ Completed**

**ClickUpService** (`clickup.service.ts`)
- Injectable NestJS service
- Wraps ClickUp API v2
- Methods implemented:
  - `getTask(taskId)` - Fetch specific task
  - `getTasksInList(listId)` - List all tasks in list
  - `getSpaces(workspaceId)` - List all spaces
  - `getList(listId)` - Get list details with statuses
  - `getListsInSpace(spaceId)` - List all lists in space
  - `createTask(listId, data)` - Create new task
  - `updateTask(taskId, data)` - Update existing task
  - `deleteTask(taskId)` - Delete a task
- Handles authentication via API token
- Returns typed responses using ClickUp API types

**ClickUpController** (`clickup.controller.ts`)
- **Purpose:** Test/exploration endpoints for ClickUp API
- Test endpoints implemented:
  - `GET /clickup/test/tasks` - List tasks in configured list
  - `GET /clickup/test/task/:taskId` - Get specific task
  - `GET /clickup/test/spaces` - List all spaces
  - `GET /clickup/test/list/:listId` - Get list details
  - `GET /clickup/test/lists/:spaceId` - List all lists in space
  - `POST /clickup/test/create-task` - Create test task
- **Note:** Webhook handling moved to WebhooksModule

**ClickUpModule** (`clickup.module.ts`)
- Exports ClickUpService for use by other modules
- Imports ConfigModule for environment variables

**Design Decision:** Each integration as a separate NestJS module
- Clear module boundaries
- Easy to add new integrations
- Modules can be tested in isolation
- Services are injectable and mockable

### 3. Database Module (`src/database/`)

**Implementation Status: ✅ Completed**

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

### 4. Webhooks Module (`src/webhooks/`)

**Implementation Status: ✅ Implemented (Event Filtering & Sync Integration Complete)**

**WebhooksController** (`webhooks.controller.ts`)
- Centralized webhook endpoint handler
- Endpoints:
  - `POST /webhooks/wrike` - Receives Wrike webhook events
  - `POST /webhooks/clickup` - Receives ClickUp webhook events
- Logs all incoming webhook payloads and headers for debugging
- Delegates event processing to WebhooksService
- Returns success/error responses

**WebhooksService** (`webhooks.service.ts`)
- Processes incoming webhook events with intelligent event filtering
- **Wrike Webhook Processing (`handleWrikeWebhook`):**
  - Handles array of webhook events from Wrike
  - **Event Type Filtering** - Only processes:
    - `TaskResponsiblesAdded` - When user is assigned
    - `TaskResponsiblesRemoved` - When user is unassigned
    - `TaskStatusChanged` - Status updates
    - `TaskTitleChanged` - Title changes
    - `TaskDescriptionChanged` - Description updates
    - `TaskDatesChanged` - Due date changes
    - `TaskDeleted` - Task deletion
  - **Smart Assignment Filtering:**
    - For `TaskResponsiblesAdded`: Only syncs if current user in `addedResponsibles`
    - For `TaskResponsiblesRemoved`: Deletes from ClickUp if current user in `removedResponsibles`
    - For other events: Verifies task is still assigned to current user
  - **Deletion Handling:**
    - `TaskResponsiblesRemoved` → Deletes ClickUp task when unassigned
    - `TaskDeleted` → Deletes ClickUp task and mapping
  - Fully integrated with SyncService
- **ClickUp Webhook Processing (`handleClickUpWebhook`):**
  - Currently logs events (reverse sync TODO)
  - TODO: Implement ClickUp → Wrike sync logic

**WebhooksModule** (`webhooks.module.ts`)
- Exports WebhooksService
- Imports WrikeModule and SyncModule for full integration
- TODO: Import ClickUpModule when reverse sync is implemented

**Design Decision:** Dedicated WebhooksModule
- Separates webhook handling from integration modules
- Wrike/ClickUp modules focus on API client logic
- WebhooksModule orchestrates sync operations
- Event-driven architecture with intelligent filtering
- Cleaner separation of concerns

**Event Filtering Strategy:**
- Prevents syncing irrelevant events (TaskCreated with null assignments)
- Only syncs when current user is actually assigned
- Handles deletion events for cleanup
- Avoids unnecessary API calls and database operations
- Solves timing issue with Wrike GUI (create → assign workflow)

### 5. Sync Module (`src/sync/`)

**Implementation Status: 🟡 Partial (Wrike → ClickUp Working)**

**SyncService** (`sync.service.ts`)
- Injectable NestJS service
- Orchestrates the sync logic between platforms
- **Implemented Methods:**
  - `syncWrikeToClickUp(wrikeTask)` - ✅ Sync Wrike task to ClickUp
  - `createClickUpTask(wrikeTask)` - ✅ Create new ClickUp task
  - `updateClickUpTask(clickUpId, wrikeTask)` - ✅ Update existing ClickUp task
  - `deleteTaskFromClickUp(wrikeTaskId)` - ✅ Delete ClickUp task and mapping
  - `logSync(data)` - ✅ Log sync operations to database
- **TODO Methods:**
  - `syncClickUpToWrike()` - ❌ Reverse sync not yet implemented
  - `manualSync()` - ❌ Manual trigger support
- Handles create, update, and delete operations based on webhook events
- Uses TypeORM repositories for TaskMapping and SyncLog entities
- Comprehensive error handling and logging

**SyncModule** (`sync.module.ts`)
- Imports WrikeModule, ClickUpModule for API access
- Imports TypeORM entities (TaskMapping, SyncLog)
- Exports SyncService for use by WebhooksModule
- Integrated into WebhooksModule for automatic sync

**Implemented Sync Flows:**

**Create/Update Flow:**
1. ✅ Webhook receives Wrike event (TaskResponsiblesAdded, TaskStatusChanged, etc.)
2. ✅ Webhook service fetches full task details
3. ✅ Check database for existing Wrike → ClickUp mapping
4. ✅ If mapping exists → Update existing ClickUp task
5. ✅ If no mapping → Create new ClickUp task and save mapping
6. ✅ Log sync operation (success or failure) to sync_logs table
7. ✅ Return success/failure

**Deletion Flow:**
1. ✅ Webhook receives TaskResponsiblesRemoved or TaskDeleted event
2. ✅ For TaskResponsiblesRemoved: Check if current user was removed
3. ✅ Look up mapping to find ClickUp task ID
4. ✅ Delete ClickUp task via API
5. ✅ Remove mapping from task_mappings table
6. ✅ Log deletion operation to sync_logs table
7. ✅ Task removed from ClickUp

**Tested & Verified:**
- ✅ Create: Wrike task "Test Task" (MAAAAAECoCvD) → ClickUp task (86dz0wcqk)
- ✅ Mapping saved to task_mappings table
- ✅ Sync logged to sync_logs table with timestamp and status
- ✅ Task visible in ClickUp web UI
- ✅ Event filtering working (TaskResponsiblesAdded triggers sync)
- ✅ Deletion flow functional (unassign/delete in Wrike → removes from ClickUp)

**Design Decision:** Separate sync module
- Isolates business logic from API and presentation layers
- Injectable service can be used by webhooks and REST API
- Easier to test in isolation
- Can be reused across different integrations
- Database-backed for reliability and auditability

### 6. API Module (`src/api/`)

**Implementation Status: ❌ Not Yet Implemented**

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

### 7. Status Mapping (`src/common/utils/`)

**Implementation Status: ❌ Not Yet Implemented**

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

### 8. Configuration Module (`src/config/`)

**Implementation Status: ✅ Completed**

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
CLICKUP_WORKSPACE_ID=your_workspace_id_here
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

### 9. Type Definitions (`src/*/types/`)

**Implementation Status: ✅ Partially Completed**

**Currently Implemented:**
- `src/wrike/types/wrike-api.types.ts` - Complete Wrike API response types (including WrikeContact for user info)
- `src/clickup/types/clickup-api.types.ts` - Complete ClickUp API response types
- `src/database/entities/*.entity.ts` - TypeORM entities with full type definitions

**Not Yet Implemented:**
- `task.types.ts` - Unified task DTOs
- `sync.types.ts` - Sync log DTOs
- `api.types.ts` - API request/response types
- `webhook.types.ts` - Webhook event payload types

**Current Type Coverage:**
- ✅ Wrike API responses (comprehensive)
- ✅ ClickUp API responses (comprehensive)
- ✅ Database entities (TypeORM)
- ❌ Webhook event payloads (using `any` currently)
- ❌ REST API endpoints
- ✅ Configuration (via NestJS ConfigModule)

**Design Decision:** Centralized types + DTOs
- Single source of truth
- Can be shared with frontend via npm package or monorepo
- Easy to update when APIs change
- Enables IntelliSense across entire codebase
- NestJS auto-validates DTOs with class-validator

## Webhook Flow

**Current Implementation:** Basic webhook reception with logging

### Wrike Webhook (`POST /webhooks/wrike`)

```typescript
@Controller('webhooks')
export class WebhooksController {
  @Post('wrike')
  @HttpCode(200)
  async wrikeWebhook(@Body() body: any, @Headers() headers: any) {
    this.logger.log('Wrike webhook received');
    this.logger.debug('Headers:', JSON.stringify(headers, null, 2));

    try {
      await this.webhooksService.handleWrikeWebhook(body);
      return { success: true };
    } catch (error) {
      this.logger.error('Error processing Wrike webhook:', error.message);
      throw error;
    }
  }
}
```

**TODO: Full Implementation Plan**
```typescript
async handleWrikeWebhook(payload: WrikeWebhookDto) {
  // 1. Validate webhook signature
  // 2. Extract taskId and eventType
  // 3. Filter for relevant events:
  //    - TaskCreated, TaskStatusChanged, TaskTitleChanged, TaskDescriptionChanged
  // 4. Check if event was triggered by sync bot (prevent loops)
  // 5. Call syncService.syncWrikeToClickUp(taskId)
  // 6. Return success response
}
```

### ClickUp Webhook (`POST /webhooks/clickup`)

```typescript
@Controller('webhooks')
export class WebhooksController {
  @Post('clickup')
  @HttpCode(200)
  async clickUpWebhook(@Body() body: any, @Headers() headers: any) {
    this.logger.log('ClickUp webhook received');
    this.logger.debug('Headers:', JSON.stringify(headers, null, 2));

    try {
      await this.webhooksService.handleClickUpWebhook(body);
      return { success: true };
    } catch (error) {
      this.logger.error('Error processing ClickUp webhook:', error.message);
      throw error;
    }
  }
}
```

**TODO: Full Implementation Plan**
```typescript
async handleClickUpWebhook(payload: ClickUpWebhookDto) {
  // 1. Validate webhook signature
  // 2. Extract task_id and event type
  // 3. Filter for relevant events:
  //    - taskCreated, taskUpdated, taskStatusUpdated
  // 4. Check if event was triggered by sync bot (prevent loops)
  // 5. Call syncService.syncClickUpToWrike(taskId)
  // 6. Return success response
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

**Backend Infrastructure:**
- ✅ NestJS architecture with modular design
- ✅ PostgreSQL database with TypeORM
- ✅ Docker Compose setup for development
- ✅ ConfigModule for environment variables
- ✅ Database entities (TaskMapping, SyncLog, User)

**Integration Modules:**
- ✅ Wrike Module (API client + test endpoints)
- ✅ ClickUp Module (API client + test endpoints)
- ✅ Comprehensive TypeScript type definitions for both APIs
- ✅ WebhooksModule (basic structure with logging)

**Not Yet Implemented:**
- ❌ SyncModule (sync orchestration logic)
- ❌ API Module (REST API for frontend)
- ❌ Auth Module (JWT authentication)
- ❌ Webhook signature verification
- ❌ Sync logic implementation
- ❌ React frontend
- ❌ Status mapping utilities
- ❌ DTO validation

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

**Current Implementation:**

```
life-assistant/
├── life-assistant-api/         # NestJS application (✅ Implemented)
│   ├── src/
│   │   ├── wrike/             # ✅ Wrike integration module
│   │   │   ├── wrike.service.ts
│   │   │   ├── wrike.controller.ts (test endpoints)
│   │   │   ├── wrike.module.ts
│   │   │   ├── dto/           # (empty - to be implemented)
│   │   │   └── types/
│   │   │       └── wrike-api.types.ts
│   │   ├── clickup/           # ✅ ClickUp integration module
│   │   │   ├── clickup.service.ts
│   │   │   ├── clickup.controller.ts (test endpoints)
│   │   │   ├── clickup.module.ts
│   │   │   └── types/
│   │   │       └── clickup-api.types.ts
│   │   ├── webhooks/          # ✅ Webhooks module (NEW!)
│   │   │   ├── webhooks.controller.ts
│   │   │   ├── webhooks.service.ts
│   │   │   ├── webhooks.module.ts
│   │   │   └── dto/           # (empty - to be implemented)
│   │   ├── database/          # ✅ Database entities & module
│   │   │   ├── entities/
│   │   │   │   ├── task-mapping.entity.ts
│   │   │   │   ├── sync-log.entity.ts
│   │   │   │   └── user.entity.ts
│   │   │   ├── database.service.ts
│   │   │   └── database.module.ts
│   │   ├── sync/              # ❌ NOT YET IMPLEMENTED
│   │   │   ├── sync.service.ts
│   │   │   └── sync.module.ts
│   │   ├── api/               # ❌ NOT YET IMPLEMENTED
│   │   │   ├── api.controller.ts
│   │   │   ├── api.service.ts
│   │   │   ├── api.module.ts
│   │   │   └── dto/
│   │   ├── auth/              # ❌ NOT YET IMPLEMENTED
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── guards/
│   │   │   └── strategies/
│   │   ├── app.controller.ts
│   │   ├── app.service.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/
│   │   └── app.e2e-spec.ts
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # ❌ NOT YET IMPLEMENTED
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
├── design.md                   # Architecture documentation
├── docker-compose.yml          # ✅ PostgreSQL setup
└── README.md
```

**Key Differences from Original Design:**
1. **WebhooksModule added** - Centralized webhook handling (not in original design)
2. **Test endpoints** - Wrike/ClickUp controllers have test endpoints for API exploration
3. **Type organization** - Types are in module-specific folders (`wrike/types/`, `clickup/types/`)
4. **No common/types yet** - Will be added when implementing sync logic
5. **No frontend yet** - Backend-first implementation approach

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
| **Dedicated WebhooksModule** | Separates webhook handling from integration logic (implemented) |
| **Test endpoints** | Integration modules have test endpoints for API exploration |
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

**Implementation Progress (as of December 26, 2025):**
- ✅ Backend foundation complete (NestJS, PostgreSQL, TypeORM)
- ✅ Integration modules implemented (Wrike, ClickUp with comprehensive API clients)
- ✅ Webhooks infrastructure ready (receiving and logging events)
- 🔨 Sync logic in progress (next major milestone)
- 📋 Frontend and API module planned (after sync is working)

**Key advantages over initial Express + SQLite design:**
- ✅ Multi-service support (frontend can query database)
- ✅ Better scalability (PostgreSQL handles concurrent connections)
- ✅ Easier to test (dependency injection, mocking)
- ✅ Faster development (NestJS CLI, decorators, auto-validation)
- ✅ Better developer experience (IntelliSense, type safety everywhere)
- ✅ Production-ready from day one (authentication, proper logging)

**Architectural Refinements During Implementation:**
- ✅ Separated webhook handling into dedicated WebhooksModule
- ✅ Added test endpoints to integration modules for API exploration
- ✅ Organized types within module directories for better encapsulation
- ✅ Used comprehensive TypeScript types for external APIs (Wrike, ClickUp)

**When to scale:**
- Add read replicas if database becomes bottleneck (>1000 users)
- Extract integration modules to separate microservices if needed
- Add Redis for caching and session management at scale
- Consider managed database (RDS, Supabase) if ops burden increases

This architecture avoids premature optimization while building on solid foundations that won't require major rewrites as the platform grows.
