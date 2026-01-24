# Deploying Blog Manager with Docker & Portainer

Complete guide to deploy your Blog Manager app on a server using Docker and Portainer.

## Prerequisites

- A server with Docker installed
- Portainer installed and accessible
- Your GitHub repository: https://github.com/brucewayne9/labsblogger
- API keys (OpenAI, Unsplash, Pexels)

## Deployment Options

### Option 1: Portainer Stacks (Recommended)

This is the easiest method using docker-compose through Portainer's Stacks feature.

#### Step 1: Access Portainer
1. Log into your Portainer instance (e.g., `http://your-server:9000`)
2. Select your Docker environment

#### Step 2: Create a New Stack
1. Go to **Stacks** in the left menu
2. Click **+ Add stack**
3. Name it: `blog-manager`

#### Step 3: Configure the Stack
Choose one of these methods:

**Method A: Git Repository (Easier)**
1. Select **Repository** as the build method
2. Repository URL: `https://github.com/brucewayne9/labsblogger`
3. Reference: `refs/heads/main`
4. Compose path: `docker-compose.yml`

**Method B: Web editor (More Control)**
1. Select **Web editor**
2. Copy and paste the contents from `docker-compose.yml`

#### Step 4: Set Environment Variables
Scroll down to **Environment variables** section and add:

```
OPENAI_API_KEY=your_openai_key_here
UNSPLASH_ACCESS_KEY=your_unsplash_key_here
PEXELS_API_KEY=your_pexels_key_here
SESSION_SECRET=your_random_long_secret_here
APP_PASSWORD=YourSecurePassword123
PORT=12800
NODE_ENV=production
MIN_IMAGES_PER_POST=4
MIN_WORD_COUNT=850
```

#### Step 5: Deploy
1. Click **Deploy the stack**
2. Wait for the deployment to complete
3. Check container status (should show as "running")

#### Step 6: Access Your App
- Access at: `http://your-server-ip:12800`
- Or set up a reverse proxy (see below)

---

### Option 2: Portainer Containers (Manual)

If you prefer to deploy without docker-compose:

#### Step 1: Create Volumes
1. Go to **Volumes** → **Add volume**
2. Create these volumes:
   - `blog-manager-data` (for blogs.json, users.json)
   - `blog-manager-uploads` (for uploaded images)

#### Step 2: Deploy Container
1. Go to **Containers** → **Add container**
2. Configure:
   - **Name**: `blog-manager`
   - **Image**: `brucewayne9/labsblogger:latest` (or build from source)
   - **Port mapping**:
     - Host: `12800` → Container: `12800`
   - **Volumes**:
     - `blog-manager-data:/app` (mount blogs.json, users.json)
     - `blog-manager-uploads:/app/uploads`
   - **Restart policy**: `Unless stopped`

3. **Environment variables**:
   ```
   OPENAI_API_KEY=your_key
   UNSPLASH_ACCESS_KEY=your_key
   PEXELS_API_KEY=your_key
   SESSION_SECRET=your_secret
   APP_PASSWORD=your_password
   PORT=12800
   NODE_ENV=production
   ```

4. Click **Deploy the container**

---

## Initial Setup

### 1. Create Required Data Files

SSH into your server or use Portainer's console:

```bash
# Access the container console via Portainer:
# Containers → blog-manager → Quick actions → Console

# Inside the container, create initial files:
echo "[]" > /app/blogs.json
echo "[]" > /app/users.json
chmod 644 /app/blogs.json /app/users.json
```

### 2. First Access
1. Open `http://your-server-ip:12800`
2. You'll be prompted to create the first super admin account
3. Add your WordPress blogs
4. Start creating content!

---

## Setting Up Reverse Proxy (Optional)

### With Nginx Proxy Manager (in Portainer)

1. Deploy Nginx Proxy Manager if not already installed
2. Add a new Proxy Host:
   - **Domain Names**: `blog.yourdomain.com`
   - **Scheme**: `http`
   - **Forward Hostname/IP**: `blog-manager` (container name)
   - **Forward Port**: `12800`
   - Enable **Block Common Exploits**
   - Enable **Websockets Support**
3. Set up SSL certificate (Let's Encrypt)

### With Traefik

Add these labels to your docker-compose.yml:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.blog-manager.rule=Host(`blog.yourdomain.com`)"
  - "traefik.http.routers.blog-manager.entrypoints=websecure"
  - "traefik.http.routers.blog-manager.tls.certresolver=letsencrypt"
  - "traefik.http.services.blog-manager.loadbalancer.server.port=12800"
```

---

## Monitoring & Maintenance

### View Logs in Portainer
1. Go to **Containers**
2. Click on `blog-manager`
3. Click **Logs** tab
4. View real-time logs

### Health Check
The container has built-in health monitoring. Check status in Portainer:
- Green = Healthy
- Red = Unhealthy (check logs)

### Backup Important Data

Create regular backups of these volumes:
- `blogs.json` - Blog configurations
- `users.json` - User accounts
- `uploads/` - Uploaded images

**Backup script (run on host):**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker cp blog-manager:/app/blogs.json ./backups/blogs-$DATE.json
docker cp blog-manager:/app/users.json ./backups/users-$DATE.json
docker cp blog-manager:/app/uploads ./backups/uploads-$DATE/
```

### Update the App

When you push updates to GitHub:

**For Stacks (Git method):**
1. Go to **Stacks** → `blog-manager`
2. Click **Update**
3. Enable **Pull latest image**
4. Click **Update**

**For manual deployments:**
1. Pull latest code: `docker pull brucewayne9/labsblogger:latest`
2. Recreate container with same settings

---

## Troubleshooting

### Container Won't Start
- Check logs in Portainer
- Verify environment variables are set correctly
- Ensure port 12800 isn't already in use
- Check volumes are mounted correctly

### Can't Access the App
- Verify container is running (green status)
- Check firewall allows port 12800
- Try accessing locally: `curl http://localhost:12800`
- Check logs for errors

### Database/File Issues
- Ensure blogs.json and users.json exist
- Check file permissions (should be readable/writable)
- Verify volumes are properly mounted

### API Errors
- Verify API keys are correct in environment variables
- Check OpenAI account has credits
- Test API keys independently

---

## Security Recommendations

1. **Change default passwords**
   - Update `APP_PASSWORD` in environment variables
   - Use strong super admin password

2. **Use HTTPS**
   - Set up reverse proxy with SSL certificate
   - Use Let's Encrypt for free SSL

3. **Firewall Rules**
   - Only expose port 12800 if needed
   - Use reverse proxy instead of direct access
   - Restrict SSH access

4. **Keep Updated**
   - Regularly update the container
   - Run `docker pull` for latest security patches
   - Monitor GitHub repository for updates

5. **Backup Regularly**
   - Automate backups of data files
   - Store backups securely off-server
   - Test restore process

---

## Quick Commands Reference

```bash
# View running containers
docker ps

# View logs
docker logs blog-manager -f

# Restart container
docker restart blog-manager

# Stop container
docker stop blog-manager

# Start container
docker start blog-manager

# Access container shell
docker exec -it blog-manager sh

# View resource usage
docker stats blog-manager

# Remove container (keeps volumes)
docker rm -f blog-manager

# Remove everything including volumes
docker rm -f blog-manager
docker volume rm blog-manager-data blog-manager-uploads
```

---

## Support

- **GitHub Issues**: https://github.com/brucewayne9/labsblogger/issues
- **Check Logs**: Always check container logs first for error details
- **Documentation**: See README.md for app usage

---

**Your Blog Manager is now running 24/7 on your server!** 🚀

Access it at: `http://your-server-ip:12800` or your configured domain.
