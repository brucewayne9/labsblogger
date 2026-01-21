# Docker & Portainer Deployment Guide

Complete guide to deploying The Blogger to Docker and Portainer.

---

## 🐳 Quick Deploy with Docker Compose

### Prerequisites
- Docker installed on your server
- Portainer running (optional but recommended)
- Ports 3000 (or your chosen port) available

### Method 1: Deploy via Portainer (Recommended)

#### Step 1: Prepare Your Files

1. **Clone the repository on your server:**
   ```bash
   cd /opt  # or your preferred directory
   git clone https://github.com/brucewayne9/labsblogger.git
   cd labsblogger
   ```

2. **Create environment file:**
   ```bash
   cp .env.docker .env
   nano .env  # Edit with your actual API keys
   ```

3. **Initialize data files:**
   ```bash
   echo "[]" > blogs.json
   echo "[]" > users.json
   chmod 666 blogs.json users.json  # Allow container to write
   ```

#### Step 2: Deploy in Portainer

1. **Log into Portainer** (usually at `http://your-server:9000`)

2. **Go to Stacks** → **Add Stack**

3. **Name your stack**: `blog-manager`

4. **Build method**: Choose **"Upload"** or **"Repository"**

   **Option A - Upload:**
   - Click "Upload"
   - Upload your `docker-compose.yml` file

   **Option B - Repository:**
   - Select "Git Repository"
   - Repository URL: `https://github.com/brucewayne9/labsblogger`
   - Compose path: `docker-compose.yml`

5. **Environment Variables:**
   Click "Add an environment variable" and add each:

   ```
   OPENAI_API_KEY = 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

   UNSPLASH_ACCESS_KEY = b2wY_xOuq01QR_Tb3_GXfd9Tpa2yfP2CQJ1TYwHWrhA

   PEXELS_API_KEY = Jg7JYCvtfwtjxyOZctCc7wmED96UUUVFdwiGN3dPko0ItZRDIDlcuqXw

   SESSION_SECRET = your_secure_random_32char_string_here
   ```

6. **Click "Deploy the stack"**

7. **Wait for deployment** (1-2 minutes for first build)

8. **Access your app:**
   - Open browser to `http://your-server-ip:3000`
   - Create your first super admin account

---

### Method 2: Deploy via Command Line

```bash
# Navigate to project directory
cd /path/to/labsblogger

# Create .env file with your credentials
cp .env.docker .env
nano .env  # Add your API keys

# Initialize data files
echo "[]" > blogs.json
echo "[]" > users.json

# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop
docker-compose down

# Restart
docker-compose restart
```

---

## 🔧 Advanced Configuration

### Custom Port Mapping

Edit `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"  # Access on port 8080 instead of 3000
```

### Behind Nginx Reverse Proxy

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name blog.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
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
```

### With SSL (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d blog.yourdomain.com

# Auto-renewal is automatic with certbot
```

---

## 📊 Monitoring in Portainer

### View Container Status
1. Go to **Containers** in Portainer
2. Find `blog-manager` container
3. Check status (green = running)

### View Logs
1. Click on `blog-manager` container
2. Click **"Logs"** tab
3. Toggle **"Auto-refresh"** for live logs

### Container Stats
1. Click on container
2. Click **"Stats"** tab
3. View CPU, Memory, Network usage

### Quick Actions
- **Restart**: Click container → **"Restart"**
- **Stop**: Click container → **"Stop"**
- **Console**: Click container → **"Console"** → **"/bin/sh"**

---

## 💾 Data Persistence

Your data is persisted in these locations:

```yaml
volumes:
  - ./blogs.json:/app/blogs.json      # Blog configurations
  - ./users.json:/app/users.json      # User accounts
  - ./uploads:/app/uploads            # Uploaded images
  - ./temp:/app/temp                  # Temporary files
```

**Backup these files regularly!**

### Backup Script
```bash
#!/bin/bash
# backup-blog-manager.sh

BACKUP_DIR="/backups/blog-manager"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/opt/labsblogger"

mkdir -p $BACKUP_DIR

tar -czf "$BACKUP_DIR/blog-manager-$DATE.tar.gz" \
  -C $APP_DIR \
  blogs.json \
  users.json \
  uploads

# Keep only last 30 days
find $BACKUP_DIR -name "blog-manager-*.tar.gz" -mtime +30 -delete

echo "Backup completed: blog-manager-$DATE.tar.gz"
```

---

## 🔄 Updates & Rebuilds

### Update to Latest Version

**Via Portainer:**
1. Go to **Stacks** → `blog-manager`
2. Click **"Pull and redeploy"** (if using Git repository)
3. OR click **"Editor"** → Update → **"Update the stack"**

**Via Command Line:**
```bash
cd /opt/labsblogger
git pull
docker-compose down
docker-compose up -d --build
```

### Rebuild Container
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 🐛 Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker-compose logs blog-manager
```

**Common issues:**
- Missing environment variables
- Port already in use
- Permission issues with data files

### Can't Access App

**Check container is running:**
```bash
docker ps | grep blog-manager
```

**Check port mapping:**
```bash
docker port blog-manager
```

**Check firewall:**
```bash
sudo ufw allow 3000/tcp
```

### Permission Denied on Data Files

```bash
cd /opt/labsblogger
sudo chown 1000:1000 blogs.json users.json
chmod 666 blogs.json users.json
```

### Container Keeps Restarting

**View logs:**
```bash
docker-compose logs -f
```

**Check environment variables are set:**
```bash
docker-compose config
```

---

## 🔒 Production Security Checklist

- [ ] Generate secure SESSION_SECRET (32+ random characters)
- [ ] Enable HTTPS with SSL certificate
- [ ] Use strong passwords for all user accounts
- [ ] Set up regular backups (daily recommended)
- [ ] Update Docker images regularly
- [ ] Restrict access with firewall rules
- [ ] Use Nginx reverse proxy
- [ ] Enable Docker healthchecks (already configured)
- [ ] Monitor container logs for errors
- [ ] Set up monitoring/alerting

---

## 📈 Resource Requirements

**Minimum:**
- CPU: 1 core
- RAM: 512MB
- Disk: 2GB

**Recommended:**
- CPU: 2 cores
- RAM: 1GB
- Disk: 5GB (includes space for uploaded images)

**Expected Resource Usage:**
- Idle: ~100MB RAM, <5% CPU
- Active (generating article): ~200-300MB RAM, 20-40% CPU
- Multiple users: Scale accordingly

---

## 🌐 Accessing from Outside Your Network

### Option 1: Port Forwarding
1. Log into your router
2. Forward external port (e.g., 3000) to server IP:3000
3. Access via: `http://your-public-ip:3000`

### Option 2: Cloudflare Tunnel (Recommended)
```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Create tunnel
cloudflared tunnel create blog-manager
cloudflared tunnel route dns blog-manager blog.yourdomain.com
cloudflared tunnel run blog-manager
```

### Option 3: Tailscale (Private Access)
```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Access via Tailscale IP from anywhere
```

---

## 📞 Support

**Container Issues:**
- Check Docker logs: `docker-compose logs`
- Verify .env file exists and has correct values
- Ensure data files have proper permissions

**Application Issues:**
- Check server logs in Portainer
- Verify API keys are correct
- Test WordPress connection from container

**Need Help?**
- GitHub Issues: https://github.com/brucewayne9/labsblogger/issues
- Check README.md for application-specific troubleshooting
