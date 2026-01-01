# Life Assistant

A powerful task synchronization service that keeps your Wrike and ClickUp projects in perfect harmony. Built with NestJS, TypeORM, and PostgreSQL.

## Overview

Life Assistant automatically synchronizes tasks between Wrike and ClickUp using webhooks for real-time bidirectional sync. When you create or update a task in either platform, the changes are instantly reflected in the other.

### Key Features

- **Bidirectional Sync**: Seamlessly sync tasks between Wrike and ClickUp
- **Real-time Updates**: Webhook-based event handling for instant synchronization
- **Smart Status Mapping**: Automatically maps custom statuses between platforms
- **Task Assignment**: Auto-assigns tasks to the appropriate users
- **Audit Trail**: Complete sync history stored in PostgreSQL
- **Secure Webhooks**: Signature verification for both Wrike and ClickUp webhooks
- **Docker Support**: Containerized deployment with Docker Compose

### Sync Capabilities

| Feature | Wrike → ClickUp | ClickUp → Wrike |
|---------|----------------|-----------------|
| Create Task | ✅ | ❌ |
| Update Task | ✅ | ✅ |
| Delete Task | ✅ (on unassignment) | ❌ |
| Status Sync | ✅ | ✅ |
| Date Sync | ✅ | ✅ |
| Description Sync | ✅ | ✅ |
| Tag Sync | ✅ | ❌ |

## Tech Stack

- **Framework**: NestJS 10.x
- **Database**: PostgreSQL 18
- **ORM**: TypeORM 0.3
- **Runtime**: Node.js 20+
- **Container**: Docker & Docker Compose

## Prerequisites

- Node.js 20 or higher
- Docker and Docker Compose
- Wrike account with API access
- ClickUp account with API access

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd life-assistant
```

### 2. Set Up Environment Variables

Create a `.env` file in the `life-assistant-api` directory:

```bash
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=life_assistant

# API Server
PORT=3000
NODE_ENV=development

# Wrike Integration
WRIKE_TOKEN=your_wrike_permanent_token

# ClickUp Integration
CLICKUP_TOKEN=your_clickup_api_token
CLICKUP_WORKSPACE_ID=your_workspace_id
CLICKUP_LIST_ID=your_target_list_id

# Webhook Security
WRIKE_WEBHOOK_SECRET=your_wrike_webhook_secret
CLICKUP_WEBHOOK_SECRET=your_clickup_webhook_secret
```

### 3. Start the Development Environment

```bash
# Start PostgreSQL and the API
docker compose up -d

# View logs
docker logs -f life-assistant-api
```

### 4. Run Database Migrations

```bash
cd life-assistant-api
npm install
npm run migration:run
```

### 5. Configure Webhooks

You need to register webhooks in both Wrike and ClickUp pointing to your API endpoints:

**Wrike Webhook URL**: `https://your-domain.com/webhooks/wrike`
**ClickUp Webhook URL**: `https://your-domain.com/webhooks/clickup`

For local development, use a tool like [ngrok](https://ngrok.com/) to expose your local server.

## API Endpoints

### Webhook Endpoints

- `POST /webhooks/wrike` - Receives Wrike webhook events
- `POST /webhooks/clickup` - Receives ClickUp webhook events

### Test Endpoints

- `GET /wrike/test/me` - Test Wrike API connection
- `GET /clickup/test/me` - Test ClickUp API connection
- `GET /wrike/test/statuses` - View Wrike custom statuses
- `GET /clickup/test/statuses` - View ClickUp statuses for configured list

## Development

### Project Structure

```
life-assistant/
├── life-assistant-api/          # Main NestJS application
│   ├── src/
│   │   ├── wrike/              # Wrike integration module
│   │   ├── clickup/            # ClickUp integration module
│   │   ├── webhooks/           # Webhook controllers
│   │   ├── sync/               # Sync orchestration logic
│   │   ├── database/           # TypeORM entities & migrations
│   │   └── main.ts             # Application entry point
│   ├── Dockerfile              # Production Docker image
│   └── package.json
├── docker-compose.yml          # Development environment
├── DEPLOYMENT.md               # Production deployment guide
└── CLAUDE.md                   # AI assistant context
```

### Common Commands

```bash
# Development
npm run start:dev              # Start with hot reload
npm run build                  # Build for production
npm run start:prod            # Run production build

# Database
npm run migration:generate -- src/database/migrations/MigrationName
npm run migration:run
npm run migration:revert

# Code Quality
npm run lint                  # Run ESLint
npm run format               # Format with Prettier
npm run test                 # Run unit tests
npm run test:e2e            # Run e2e tests
```

### Creating a New Migration

```bash
npm run migration:generate -- src/database/migrations/YourMigrationName
npm run migration:run
```

## How It Works

### Wrike to ClickUp Flow

1. Task created/updated in Wrike
2. Wrike sends webhook event to `/webhooks/wrike`
3. Webhook verified using `X-Hook-Secret` header
4. SyncService creates/updates corresponding ClickUp task
5. Task mapping stored in database
6. Sync operation logged to `sync_logs` table

### ClickUp to Wrike Flow

1. Task updated in ClickUp
2. ClickUp sends webhook event to `/webhooks/clickup`
3. Webhook verified using `X-Signature` HMAC-SHA256
4. SyncService updates corresponding Wrike task
5. Sync operation logged to `sync_logs` table

### Status Mapping

The service intelligently maps custom statuses between platforms:

- Loads and caches status workflows on first use
- Performs case-insensitive matching
- Falls back to default statuses if no match found

### Date Handling

- **Wrike**: Uses ISO 8601 format (e.g., `2024-01-01T12:00:00`)
- **ClickUp**: Uses Unix timestamps in milliseconds (as strings)
- Automatic conversion between formats during sync

## Deployment

For production deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

Quick production deployment:

```bash
# Build production image
docker build -t life-assistant-api ./life-assistant-api

# Run with production environment
docker run -d \
  --name life-assistant-api \
  --env-file .env.production \
  -p 3000:3000 \
  life-assistant-api
```

## Database Schema

### TaskMapping

Stores the relationship between Wrike and ClickUp tasks:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| wrikeTaskId | varchar | Wrike task ID |
| clickupTaskId | varchar | ClickUp task ID |
| createdAt | timestamp | Creation timestamp |
| updatedAt | timestamp | Last update timestamp |

### SyncLog

Audit trail of all sync operations:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| source | enum | 'wrike' or 'clickup' |
| action | enum | 'create', 'update', 'delete' |
| status | enum | 'success' or 'failed' |
| taskMappingId | uuid | Reference to task mapping |
| errorMessage | text | Error details (if failed) |
| metadata | json | Additional context |
| createdAt | timestamp | Operation timestamp |

## Troubleshooting

### Webhooks Not Triggering

1. Ensure your webhook URLs are publicly accessible
2. Check webhook signature secrets match your configuration
3. Review application logs: `docker logs -f life-assistant-api`
4. Verify webhooks are registered in Wrike/ClickUp settings

### Sync Failures

1. Check the `sync_logs` table for error messages
2. Verify API tokens are valid and have proper permissions
3. Ensure workspace/list IDs are correct
4. Review status mapping configuration

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose ps

# View database logs
docker logs -f life-assistant-db

# Test connection
docker compose exec db psql -U postgres -d life_assistant
```

## API Token Setup

### Wrike

1. Go to Wrike Settings → Apps & Integrations → API
2. Create a new permanent token
3. Copy token to `WRIKE_TOKEN` environment variable

### ClickUp

1. Go to ClickUp Settings → Apps
2. Generate an API token
3. Copy token to `CLICKUP_TOKEN` environment variable
4. Get your Workspace ID from the URL or API
5. Get your List ID from the target list

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

### Code Style

- Follow the existing code style
- Run `npm run lint` and `npm run format` before committing
- Write tests for new features
- Update documentation as needed

## License

UNLICENSED - Private project

## Support

For issues, questions, or contributions, please open an issue on GitHub.

## Acknowledgments

Built with:
- [NestJS](https://nestjs.com/) - A progressive Node.js framework
- [TypeORM](https://typeorm.io/) - ORM for TypeScript and JavaScript
- [PostgreSQL](https://www.postgresql.org/) - Advanced open source database
- [Wrike API](https://developers.wrike.com/) - Wrike REST API
- [ClickUp API](https://clickup.com/api) - ClickUp API v2
