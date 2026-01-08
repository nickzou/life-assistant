#!/bin/bash

# Rollback Script
# Usage: ./rollback.sh [production|staging] <image-tag>

set -e

ENV=${1}
VERSION=${2}

# Validate arguments
if [ -z "$ENV" ] || [ -z "$VERSION" ]; then
    echo "Usage: ./rollback.sh [production|staging] <image-tag>"
    echo ""
    echo "Examples:"
    echo "  ./rollback.sh production main-abc1234"
    echo "  ./rollback.sh staging staging-xyz789"
    echo ""
    echo "Available tags:"
    docker images ghcr.io/*/life-assistant --format "table {{.Tag}}\t{{.CreatedAt}}" | head -10
    exit 1
fi

# Validate environment
if [[ "$ENV" != "production" && "$ENV" != "staging" ]]; then
    echo "Error: Environment must be 'production' or 'staging'"
    exit 1
fi

cd "/var/www/life-assistant/$ENV"

echo "Rolling back $ENV to version: $VERSION"
echo ""

# Load GitHub username from env
source .env.$ENV

# Update docker-compose.yml to use specified version
sed -i.bak "s|ghcr.io/.*/life-assistant:.*|ghcr.io/${GITHUB_USERNAME}/life-assistant:$VERSION|" docker-compose.yml

echo "Pulling image..."
docker compose pull

echo "Restarting containers..."
docker compose up -d

echo ""
echo "✅ Rolled back $ENV to version $VERSION"
echo ""
echo "Container status:"
docker compose ps
