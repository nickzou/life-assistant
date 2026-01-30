# Nginx Configuration for Life Assistant

Pre-configured Nginx reverse proxy setup for production and staging environments.

## Domain Setup

This configuration is set up for:
- **Production**: `life-assistant-api.waffleruntime.com` → Port 3000
- **Staging**: `staging.life-assistant-api.waffleruntime.com` → Port 3001

## Files

- `life-assistant-production.conf` - Production Nginx configuration
- `life-assistant-staging.conf` - Staging Nginx configuration
- `setup-nginx.sh` - Automated setup script

## Prerequisites

Before running the setup:

1. **Server Access**: SSH access to your DigitalOcean droplet
2. **DNS Configured**: A records pointing to your server IP
   ```
   life-assistant-api.waffleruntime.com → YOUR_DROPLET_IP
   staging.life-assistant-api.waffleruntime.com → YOUR_DROPLET_IP
   ```
3. **Docker Containers Running**: Your API containers should be running on ports 3000 (prod) and 3001 (staging)

## Quick Setup

### 1. Upload Files to Server

From your local machine:
```bash
# Upload the nginx directory to your server
scp -r deployment/nginx user@YOUR_SERVER_IP:/tmp/
```

### 2. Run Setup Script

On your server:
```bash
cd /tmp/nginx
sudo ./setup-nginx.sh
```

The script will:
- Install Nginx (if needed)
- Copy configuration files
- Enable sites
- Test configuration
- Reload Nginx

### 3. Install SSL Certificates

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificates for production
sudo certbot --nginx -d life-assistant-api.waffleruntime.com

# Get certificates for staging
sudo certbot --nginx -d staging.life-assistant-api.waffleruntime.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 4. Verify Setup

```bash
# Check Nginx status
sudo systemctl status nginx

# Test production endpoint
curl https://life-assistant-api.waffleruntime.com/health

# Test staging endpoint
curl https://staging.life-assistant-api.waffleruntime.com/health
```

## Manual Setup (Alternative)

If you prefer to set up manually without the script:

```bash
# Copy configs
sudo cp life-assistant-production.conf /etc/nginx/sites-available/
sudo cp life-assistant-staging.conf /etc/nginx/sites-available/

# Enable sites
sudo ln -s /etc/nginx/sites-available/life-assistant-production.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/life-assistant-staging.conf /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Configuration Details

### Production (`life-assistant-production.conf`)
- Listens on ports 80 (HTTP) and 443 (HTTPS)
- Redirects HTTP → HTTPS
- Proxies to `127.0.0.1:3000` (Docker container)
- SSL/TLS with Let's Encrypt certificates
- HSTS header for security
- `/health` endpoint with no access logging

### Staging (`life-assistant-staging.conf`)
- Listens on ports 80 (HTTP) and 443 (HTTPS)
- Redirects HTTP → HTTPS
- Proxies to `127.0.0.1:3001` (Docker container)
- SSL/TLS with Let's Encrypt certificates

## Troubleshooting

### Nginx won't start
```bash
# Check configuration syntax
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log
```

### SSL certificate issues
```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal
```

### Can't reach the service
```bash
# Check if containers are running
docker ps

# Check if Nginx is running
sudo systemctl status nginx

# Check DNS resolution
nslookup life-assistant-api.waffleruntime.com

# Test local connection (bypass Nginx)
curl http://localhost:3000/health
curl http://localhost:3001/health
```

### Port already in use
```bash
# Check what's using port 80/443
sudo lsof -i :80
sudo lsof -i :443

# Usually Apache - stop it if installed
sudo systemctl stop apache2
sudo systemctl disable apache2
```

## Updating Configuration

If you need to modify the Nginx configuration:

```bash
# Edit the config file
sudo nano /etc/nginx/sites-available/life-assistant-production.conf

# Test configuration
sudo nginx -t

# Reload Nginx (no downtime)
sudo systemctl reload nginx
```

## Maintenance

### View Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Renewal
Certbot automatically renews certificates. Verify with:
```bash
sudo systemctl status certbot.timer
```

## Security Notes

- Both configs enforce HTTPS (HTTP automatically redirects)
- TLS 1.2 and 1.3 only (TLS 1.0/1.1 disabled)
- HSTS header prevents downgrade attacks
- Strong cipher suites configured
- Real IP forwarding for proper logging

## See Also

- [DEPLOYMENT.md](../../DEPLOYMENT.md) - Complete deployment guide
- [docker-compose.yml](../docker-compose.production.yml) - Production Docker setup
