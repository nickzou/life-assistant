# ClickUp Module

This module provides integration with the ClickUp API for task management and completion tracking.

## Architecture

```
clickup/
├── clickup.module.ts           # NestJS module definition
├── clickup.controller.ts       # REST endpoints
├── clickup.service.ts          # Core API client (403 lines)
├── clickup-stats.service.ts    # Stats & analytics (178 lines)
└── types/
    └── clickup-api.types.ts    # TypeScript interfaces
```

### Service Responsibilities

| Service | Purpose |
|---------|---------|
| `ClickUpService` | Low-level API operations (CRUD, webhooks, tags) |
| `ClickUpStatsService` | Completion stats, rate calculations, task summaries |

## ClickUpService

Core API client wrapping the ClickUp REST API. Handles authentication, request/response, and caching.

### Initialization

On module init, fetches and caches the current user ID for auto-assignment features.

### Methods

#### User
- `getCurrentUserId()` - Get cached user ID
- `getAuthorizedUser()` - Fetch authenticated user details

#### Tasks
- `getTask(taskId)` - Fetch a single task
- `getTasksInList(listId)` - Fetch all tasks in a list
- `getTasksByDateRange(workspaceId, startTime, endTime, options?)` - Query tasks by due date
- `getOverdueTasks(workspaceId, beforeTime)` - Get incomplete overdue tasks
- `createTask(listId, taskData)` - Create a new task
- `updateTask(taskId, taskData)` - Update an existing task
- `deleteTask(taskId)` - Delete a task

#### Tags
- `addTag(taskId, tagName)` - Add a tag to a task
- `removeTag(taskId, tagName)` - Remove a tag from a task

#### Custom Fields
- `setCustomField(taskId, fieldId, value)` - Set a custom field value
- `getListCustomFields(listId)` - Get custom fields for a list

#### Structure
- `getSpaces(workspaceId)` - List spaces in workspace
- `getListsInSpace(spaceId)` - List lists in a space
- `getList(listId)` - Get list details

#### Webhooks
- `listWebhooks(teamId)` - List registered webhooks
- `createWebhook(teamId, hookUrl)` - Register a new webhook
- `deleteWebhook(webhookId)` - Delete a webhook

## ClickUpStatsService

Higher-level service for completion tracking and analytics. Uses `ClickUpService` for API calls.

### Methods

#### `getTasksDueToday(workspaceId)`
Returns today's task summary:
```typescript
{
  total: number;           // Tasks due today (excluding "in progress")
  completed: number;       // Tasks with done/closed status
  remaining: number;       // total - completed
  overdue: number;         // Incomplete tasks from before today
  affirmativeCompletions: number;  // Tasks with positive completion status
  completionRate: number;  // Percentage (0-100)
}
```

#### `getCompletionStatsForDate(workspaceId, date)`
Returns stats for a specific date.

#### `getCompletionStatsHistory(workspaceId, days)`
Returns stats for the last N days (fetched in parallel for performance).

### Status Classification

**Affirmative statuses** (count as completed):
- `complete`, `completed`, `went`, `attended`

**Excluded statuses** (not counted in totals):
- `in progress`

## API Endpoints

### Protected (require JWT)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clickup/tasks/today` | Today's task summary |
| GET | `/clickup/tasks/stats/:days` | Completion history |
| POST | `/clickup/webhooks/setup` | Register webhook |

### Test Endpoints (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clickup/test/tasks` | List tasks in configured list |
| GET | `/clickup/test/task/:taskId` | Fetch single task |
| GET | `/clickup/test/spaces` | List workspace spaces |
| GET | `/clickup/test/list/:listId` | Get list details |
| GET | `/clickup/test/lists/:spaceId` | List lists in space |
| POST | `/clickup/test/create-task` | Create test task |
| GET | `/clickup/webhooks/:teamId` | List webhooks |
| DELETE | `/clickup/webhooks/:webhookId` | Delete webhook |

## Configuration

Required environment variables:

```env
CLICKUP_TOKEN=pk_...           # API token
CLICKUP_WORKSPACE_ID=123456    # Team/workspace ID
CLICKUP_LIST_ID=901234         # Default list for tasks
```

## Usage Example

```typescript
// Inject services
constructor(
  private clickUpService: ClickUpService,
  private clickUpStatsService: ClickUpStatsService,
) {}

// Create a task
const task = await this.clickUpService.createTask(listId, {
  name: 'My Task',
  due_date: Date.now() + 86400000, // Tomorrow
  tags: ['important'],
});

// Get today's stats
const stats = await this.clickUpStatsService.getTasksDueToday(workspaceId);
console.log(`Completion rate: ${stats.completionRate}%`);
```
