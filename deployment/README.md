# Deployment Files

Production-ready deployment configuration for Life Assistant.

## Directory Structure

```
deployment/
├── production/
│   ├── docker-compose.yml       # Production Docker Compose config
│   └── .env.example             # Production environment template
├── staging/
│   ├── docker-compose.yml       # Staging Docker Compose config
│   └── .env.example             # Staging environment template
└── scripts/
    ├── backup-db.sh             # Database backup script
    ├── rollback.sh              # Version rollback script
    └── health-check.sh          # Service health check script
```

## Quick Start

### 1. Server Setup

On your deployment server:

```bash
# Create directory structure
sudo mkdir -p /var/www/life-assistant/{production,staging,backups}
sudo chown -R $USER:$USER /var/www/life-assistant

# Copy deployment files
cd /var/www/life-assistant
git clone <repo-url> temp
cp -r temp/deployment/production ./
cp -r temp/deployment/staging ./
cp -r temp/deployment/scripts ./
rm -rf temp

# Create environment files
cd production
cp .env.example .env.production
nano .env.production  # Edit with your actual values

cd ../staging
cp .env.example .env.staging
nano .env.staging  # Edit with your actual values
```

### 2. Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

| Secret Name | Description |
|------------|-------------|
| `SSH_HOST` | Your server IP address |
| `SSH_USER` | SSH username |
| `SSH_PRIVATE_KEY` | SSH private key for deployment |

### 3. Deploy

Push to `main` (production) or `staging` branch - GitHub Actions will automatically:
1. Build Docker image
2. Push to GitHub Container Registry
3. Deploy to server
4. Run database migrations

## Helper Scripts

### Database Backup

```bash
# Backup production database
./scripts/backup-db.sh production

# Backup staging database
./scripts/backup-db.sh staging
```

Backups are stored in `/var/www/life-assistant/backups/` and automatically cleaned up after 7 days.

**Automated Backups**: Add to crontab:
```bash
crontab -e
# Add: 0 2 * * * /var/www/life-assistant/scripts/backup-db.sh production
```

### Rollback

```bash
# List available versions
docker images ghcr.io/*/life-assistant

# Rollback production
./scripts/rollback.sh production main-abc1234

# Rollback staging
./scripts/rollback.sh staging staging-xyz789
```

### Health Check

```bash
# Check all services
./scripts/health-check.sh
```

Shows:
- Service health status (production & staging)
- Container states
- Docker disk usage
- Resource usage (CPU, memory)

## Manual Deployment

If you need to deploy manually:

```bash
# Production
cd /var/www/life-assistant/production
docker compose pull
docker compose up -d
docker compose exec api npm run migration:run

# Staging
cd /var/www/life-assistant/staging
docker compose pull
docker compose up -d
docker compose exec api npm run migration:run
```

## Viewing Logs

```bash
# Production logs
docker compose -f /var/www/life-assistant/production/docker-compose.yml logs -f

# Staging logs
docker compose -f /var/www/life-assistant/staging/docker-compose.yml logs -f

# Specific service
docker compose logs -f api
docker compose logs -f postgres
```

## Environment Variables

Both `.env.production` and `.env.staging` require:

```bash
# GitHub Container Registry
GITHUB_USERNAME=your-github-username

# Application
NODE_ENV=production  # or staging
PORT=3000

# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USERNAME=life_app
DATABASE_PASSWORD=secure_password_here
DATABASE_NAME=life_assistant

# Wrike Integration
WRIKE_TOKEN=your_token

# ClickUp Integration
CLICKUP_TOKEN=your_token
CLICKUP_WORKSPACE_ID=your_workspace_id
CLICKUP_LIST_ID=your_list_id

# Webhook Security
WRIKE_WEBHOOK_SECRET=your_secret
CLICKUP_WEBHOOK_SECRET=your_secret
```

## Troubleshooting

### Container won't start
```bash
docker compose logs api
docker compose config  # Verify environment variables
```

### Database connection issues
```bash
docker compose exec postgres psql -U life_app life_assistant
```

### Force update
```bash
docker compose pull --ignore-pull-failures
docker compose down
docker compose up -d
```

### Clean up Docker resources
```bash
docker system prune -a --volumes  # WARNING: Deletes all unused resources
```

## Complete Deployment Guide

See [DEPLOYMENT.md](../DEPLOYMENT.md) for the full production deployment guide including:
- Server setup and prerequisites
- Nginx configuration
- SSL certificate setup
- Monitoring and maintenance
- Detailed troubleshooting
