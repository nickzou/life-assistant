#!/bin/bash

# Database Backup Script
# Usage: ./backup-db.sh [production|staging]

set -e

ENV=${1:-production}
BACKUP_DIR="/var/www/life-assistant/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Validate environment
if [[ "$ENV" != "production" && "$ENV" != "staging" ]]; then
    echo "Error: Environment must be 'production' or 'staging'"
    echo "Usage: ./backup-db.sh [production|staging]"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Get database credentials from env file
cd "/var/www/life-assistant/$ENV"
source .env.$ENV

echo "Starting backup for $ENV environment..."

# Create backup
docker compose exec -T postgres \
    pg_dump -U "$DATABASE_USERNAME" "$DATABASE_NAME" | \
    gzip > "$BACKUP_DIR/${ENV}_db_${DATE}.sql.gz"

echo "✅ Backup created: $BACKUP_DIR/${ENV}_db_${DATE}.sql.gz"

# Remove backups older than 7 days
find "$BACKUP_DIR" -name "${ENV}_db_*.sql.gz" -mtime +7 -delete

echo "✅ Old backups cleaned up (keeping last 7 days)"

# List recent backups
echo ""
echo "Recent backups:"
ls -lh "$BACKUP_DIR" | grep "${ENV}_db_" | tail -5
