#!/bin/bash

# Health Check Script
# Usage: ./health-check.sh

set -e

echo "Life Assistant - Health Check"
echo "=============================="
echo ""

check_service() {
    local env=$1
    local port=$2
    local url="http://localhost:$port/health"

    echo -n "Checking $env... "

    if curl -sf "$url" > /dev/null 2>&1; then
        echo "✅ Healthy"

        # Get container status
        cd "/var/www/life-assistant/$env"
        echo "  API: $(docker compose ps api --format '{{.State}}')"
        echo "  DB:  $(docker compose ps postgres --format '{{.State}}')"
    else
        echo "❌ DOWN or Unhealthy"

        # Show container status
        cd "/var/www/life-assistant/$env"
        docker compose ps
    fi

    echo ""
}

# Check both environments
check_service "production" 3000
check_service "staging" 3001

# Show disk usage
echo "Docker Disk Usage:"
echo "=================="
docker system df

echo ""
echo "Container Resource Usage:"
echo "========================="
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
    life-assistant-api-prod \
    life-assistant-db-prod \
    life-assistant-api-staging \
    life-assistant-db-staging
