#!/bin/bash

set -e  # Exit on error

echo "================================================"
echo "Life Assistant - Nginx Configuration Setup"
echo "================================================"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run with sudo"
    echo "Usage: sudo ./setup-nginx.sh"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📋 Step 1: Installing Nginx (if not already installed)..."
if ! command -v nginx &> /dev/null; then
    apt update
    apt install -y nginx
    echo "✅ Nginx installed"
else
    echo "✅ Nginx already installed"
fi

echo ""
echo "📋 Step 2: Copying configuration files..."

# Copy production config
cp "$SCRIPT_DIR/life-assistant-production.conf" /etc/nginx/sites-available/
echo "✅ Copied life-assistant-production.conf"

# Copy staging config
cp "$SCRIPT_DIR/life-assistant-staging.conf" /etc/nginx/sites-available/
echo "✅ Copied life-assistant-staging.conf"

echo ""
echo "📋 Step 3: Enabling sites..."

# Enable production site
ln -sf /etc/nginx/sites-available/life-assistant-production.conf /etc/nginx/sites-enabled/
echo "✅ Enabled production site"

# Enable staging site
ln -sf /etc/nginx/sites-available/life-assistant-staging.conf /etc/nginx/sites-enabled/
echo "✅ Enabled staging site"

echo ""
echo "📋 Step 4: Testing Nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi

echo ""
echo "📋 Step 5: Reloading Nginx..."
systemctl reload nginx
echo "✅ Nginx reloaded"

echo ""
echo "================================================"
echo "✅ Nginx setup complete!"
echo "================================================"
echo ""
echo "⚠️  IMPORTANT: SSL certificates are NOT configured yet"
echo ""
echo "Next steps:"
echo "1. Ensure DNS records point to this server:"
echo "   - life-assistant-api.waffleruntime.com → $(curl -s ifconfig.me)"
echo "   - staging.life-assistant-api.waffleruntime.com → $(curl -s ifconfig.me)"
echo ""
echo "2. Install SSL certificates:"
echo "   sudo certbot --nginx -d life-assistant-api.waffleruntime.com"
echo "   sudo certbot --nginx -d staging.life-assistant-api.waffleruntime.com"
echo ""
echo "3. Verify certificates auto-renew:"
echo "   sudo certbot renew --dry-run"
echo ""
