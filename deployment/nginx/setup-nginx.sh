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
echo "📋 Step 2: Creating temporary HTTP-only configs..."
echo "   (SSL certificates don't exist yet, need Certbot first)"

# Create temporary HTTP-only production config
cat > /etc/nginx/sites-available/life-assistant-production.conf << 'EOF'
server {
    listen 80;
    server_name life-assistant-api.waffleruntime.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        access_log off;
    }
}
EOF
echo "✅ Created temporary production config (HTTP-only)"

# Create temporary HTTP-only staging config
cat > /etc/nginx/sites-available/life-assistant-staging.conf << 'EOF'
server {
    listen 80;
    server_name staging.life-assistant-api.waffleruntime.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
echo "✅ Created temporary staging config (HTTP-only)"

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
echo "✅ Nginx reloaded with HTTP-only configs"

echo ""
echo "📋 Step 6: Installing Certbot (if not already installed)..."
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
    echo "✅ Certbot installed"
else
    echo "✅ Certbot already installed"
fi

echo ""
echo "📋 Step 7: Obtaining SSL certificates..."
echo "   This will automatically configure HTTPS in Nginx"
echo ""

# Get certificate for production
echo "Getting certificate for life-assistant-api.waffleruntime.com..."
certbot --nginx -d life-assistant-api.waffleruntime.com --non-interactive --agree-tos --register-unsafely-without-email || {
    echo "⚠️  Certbot failed. You may need to run it manually:"
    echo "   sudo certbot --nginx -d life-assistant-api.waffleruntime.com"
}

echo ""
# Get certificate for staging
echo "Getting certificate for staging.life-assistant-api.waffleruntime.com..."
certbot --nginx -d staging.life-assistant-api.waffleruntime.com --non-interactive --agree-tos --register-unsafely-without-email || {
    echo "⚠️  Certbot failed. You may need to run it manually:"
    echo "   sudo certbot --nginx -d staging.life-assistant-api.waffleruntime.com"
}

echo ""
echo "📋 Step 8: Updating configs to use http2 directive..."
echo "   Certbot auto-configured SSL, now adding http2 on directive"

# Update production config to add http2 directive
sed -i '/listen 443 ssl;/a\    http2 on;' /etc/nginx/sites-available/life-assistant-production.conf

# Update staging config to add http2 directive
sed -i '/listen 443 ssl;/a\    http2 on;' /etc/nginx/sites-available/life-assistant-staging.conf

echo "✅ Updated configs with http2 directive"

echo ""
echo "📋 Step 9: Testing final Nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi

echo ""
echo "📋 Step 10: Reloading Nginx with SSL configs..."
systemctl reload nginx
echo "✅ Nginx reloaded"

echo ""
echo "================================================"
echo "✅ Nginx setup complete with SSL!"
echo "================================================"
echo ""
echo "📊 Testing endpoints:"
SERVER_IP=$(curl -s ifconfig.me)
echo "   Server IP: $SERVER_IP"
echo ""
echo "   Production: https://life-assistant-api.waffleruntime.com"
echo "   Staging:    https://staging.life-assistant-api.waffleruntime.com"
echo ""
echo "Next steps:"
echo "1. Test the endpoints:"
echo "   curl https://life-assistant-api.waffleruntime.com/health"
echo "   curl https://staging.life-assistant-api.waffleruntime.com/health"
echo ""
echo "2. Verify auto-renewal:"
echo "   sudo certbot renew --dry-run"
echo ""
