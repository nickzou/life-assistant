# ClickUp Module

This module provides integration with the ClickUp API for task management, completion tracking, and daily task views.

## Architecture

```
clickup/
├── clickup.module.ts           # NestJS module definition
├── clickup.controller.ts       # REST endpoints
├── clickup.service.ts          # Core API client
├── clickup-stats.service.ts    # Stats & analytics
├── clickup-tasks.service.ts    # Task list with full details
└── types/
    └── clickup-api.types.ts    # TypeScript interfaces
```

### Service Responsibilities

| Service | Purpose |
|---------|---------|
| `ClickUpService` | Low-level API operations (CRUD, webhooks, tags) |
| `ClickUpStatsService` | Completion stats, rate calculations, task summaries |
| `ClickUpTasksService` | Task lists with full details for UI display |

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

## ClickUpTasksService

Service for fetching tasks with full details, designed for frontend display. Includes parent task names, Time of Day custom field with colors, and proper sorting.

### Methods

#### `getTasksDueToday(workspaceId)`
Returns today's tasks and overdue tasks with full details:
```typescript
interface TodayTasksResponse {
  tasks: TaskItem[];       // Tasks due today, sorted by Time of Day
  overdueTasks: TaskItem[]; // Overdue tasks, sorted by Time of Day
}

interface TaskItem {
  id: string;
  name: string;
  parentName: string | null;  // Parent task name for subtasks
  status: {
    status: string;
    type: string;    // 'open', 'done', 'closed'
    color: string;   // Hex color for UI
  };
  dueDate: string | null;
  hasDueTime: boolean;  // True only if time was explicitly set
  tags: string[];
  timeOfDay: {
    name: string;    // e.g., 'Morning', 'Evening'
    color: string;   // Hex color from ClickUp
  } | null;
  url: string;       // Direct link to task in ClickUp
}
```

### Time of Day Sorting

Tasks are sorted by Time of Day custom field in this order:
1. Early Morning
2. Morning
3. Mid Day
4. Evening
5. Before Bed
6. (No Time of Day set)

### Parent Task Resolution

For subtasks, the service fetches parent task names in parallel with deduplication to minimize API calls.

## API Endpoints

### Protected (require JWT)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clickup/tasks/today` | Today's task summary (stats only) |
| GET | `/clickup/tasks/today/list` | Today's tasks with full details |
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
  private clickUpTasksService: ClickUpTasksService,
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

// Get today's tasks with full details for UI display
const { tasks, overdueTasks } = await this.clickUpTasksService.getTasksDueToday(workspaceId);
tasks.forEach(task => {
  console.log(`${task.timeOfDay?.name || 'Anytime'}: ${task.name}`);
});
```
