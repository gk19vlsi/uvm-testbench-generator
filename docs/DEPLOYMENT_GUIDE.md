# Deployment Guide

## Overview

This guide covers deploying the UVM Testbench Chatbot application to production using Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum (8GB recommended)
- 20GB disk space minimum
- OpenAI API key

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/uvm-testbench-chatbot.git
cd uvm-testbench-chatbot
```

### 2. Configure Environment Variables

```bash
cp .env.production.example .env.production
```

Edit `.env.production` and set:

- `MONGO_ROOT_USERNAME` - MongoDB admin username
- `MONGO_ROOT_PASSWORD` - Strong password for MongoDB
- `OPENAI_API_KEY` - Your OpenAI API key
- `CORS_ORIGIN` - Your frontend domain
- `VITE_API_URL` - Your backend API URL

### 3. Build and Start Services

```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### 4. Verify Deployment

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check backend health
curl http://localhost:3000/health

# Check frontend
curl http://localhost:80
```

### 5. Access the Application

Open your browser and navigate to `http://localhost` (or your configured domain).

## Detailed Configuration

### MongoDB Configuration

**Environment Variables:**

```bash
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_secure_password
```

**Data Persistence:**

- Data stored in Docker volume `mongodb_data`
- Configuration in `mongodb_config`

**Backup:**

```bash
# Backup database
docker exec uvm-chatbot-mongodb-prod mongodump --out /backup

# Restore database
docker exec uvm-chatbot-mongodb-prod mongorestore /backup
```

### Backend Configuration

**Environment Variables:**

```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://admin:password@mongodb:27017/uvm-chatbot?authSource=admin
OPENAI_API_KEY=sk-your-key
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
UPLOAD_DIR=/app/projects
```

**File Storage:**

- Projects stored in Docker volume `backend_projects`
- Logs stored in `backend_logs`

**Logs:**

```bash
# View backend logs
docker logs uvm-chatbot-backend-prod

# Follow logs
docker logs -f uvm-chatbot-backend-prod
```

### Frontend Configuration

**Build Arguments:**

```bash
VITE_API_URL=https://api.yourdomain.com
```

**Nginx Configuration:**
The frontend uses Nginx to serve static files and proxy API requests.

**Custom Nginx Config:**
Create `frontend/nginx.conf` to customize Nginx settings.

## SSL/TLS Configuration

### Using Let's Encrypt

1. Install Certbot:

```bash
sudo apt-get install certbot python3-certbot-nginx
```

2. Obtain certificate:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

3. Update `docker-compose.prod.yml`:

```yaml
frontend:
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro
  ports:
    - "443:443"
```

### Using Custom Certificates

1. Place certificates in `./certs/`:
   - `cert.pem` - SSL certificate
   - `key.pem` - Private key

2. Update `docker-compose.prod.yml`:

```yaml
frontend:
  volumes:
    - ./certs:/etc/nginx/certs:ro
```

## Scaling

### Horizontal Scaling

Scale backend instances:

```bash
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

Add load balancer (Nginx):

```yaml
nginx:
  image: nginx:alpine
  volumes:
    - ./nginx-lb.conf:/etc/nginx/nginx.conf:ro
  ports:
    - "80:80"
  depends_on:
    - backend
```

### Vertical Scaling

Increase resource limits in `docker-compose.prod.yml`:

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: "2"
        memory: 4G
      reservations:
        cpus: "1"
        memory: 2G
```

## Monitoring

### Health Checks

All services include health checks:

- MongoDB: Database ping
- Backend: `/health` endpoint
- Frontend: HTTP request to root

### Logging

**View all logs:**

```bash
docker-compose -f docker-compose.prod.yml logs
```

**View specific service:**

```bash
docker-compose -f docker-compose.prod.yml logs backend
```

**Export logs:**

```bash
docker-compose -f docker-compose.prod.yml logs > application.log
```

### Metrics

Consider adding monitoring tools:

- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **Sentry** - Error tracking
- **New Relic** - APM

## Backup and Recovery

### Database Backup

**Automated backup script:**

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker exec uvm-chatbot-mongodb-prod mongodump --out /backup/$DATE
docker cp uvm-chatbot-mongodb-prod:/backup/$DATE ./backups/
```

**Schedule with cron:**

```bash
0 2 * * * /path/to/backup.sh
```

### File Storage Backup

```bash
# Backup projects
docker run --rm -v backend_projects:/data -v $(pwd):/backup alpine tar czf /backup/projects-backup.tar.gz /data

# Restore projects
docker run --rm -v backend_projects:/data -v $(pwd):/backup alpine tar xzf /backup/projects-backup.tar.gz -C /
```

## Security

### Best Practices

1. **Use strong passwords** for MongoDB
2. **Keep API keys secure** - Never commit to version control
3. **Enable HTTPS** in production
4. **Regular updates** - Keep Docker images updated
5. **Firewall rules** - Restrict access to necessary ports
6. **Rate limiting** - Already implemented in application
7. **Input validation** - Already implemented in application

### Network Security

```yaml
# Restrict MongoDB access
mongodb:
  networks:
    - uvm-chatbot-network
  # Don't expose ports externally
```

### Environment Variables

Never commit `.env.production` to version control:

```bash
echo ".env.production" >> .gitignore
```

## Troubleshooting

### Services Won't Start

**Check logs:**

```bash
docker-compose -f docker-compose.prod.yml logs
```

**Common issues:**

- MongoDB authentication failure - Check credentials
- Port already in use - Change port mapping
- Insufficient resources - Increase Docker resources

### Database Connection Errors

**Verify MongoDB is running:**

```bash
docker exec uvm-chatbot-mongodb-prod mongosh --eval "db.adminCommand('ping')"
```

**Check connection string:**
Ensure `MONGODB_URI` matches MongoDB configuration.

### Frontend Can't Reach Backend

**Check CORS configuration:**
Ensure `CORS_ORIGIN` matches your frontend domain.

**Verify backend is accessible:**

```bash
curl http://localhost:3000/health
```

### High Memory Usage

**Check resource usage:**

```bash
docker stats
```

**Increase limits or scale horizontally.**

## Maintenance

### Updating the Application

1. Pull latest changes:

```bash
git pull origin main
```

2. Rebuild images:

```bash
docker-compose -f docker-compose.prod.yml build
```

3. Restart services:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Database Maintenance

**Compact database:**

```bash
docker exec uvm-chatbot-mongodb-prod mongosh --eval "db.runCommand({compact: 'projects'})"
```

**Rebuild indexes:**

```bash
docker exec uvm-chatbot-mongodb-prod mongosh --eval "db.projects.reIndex()"
```

### Cleanup

**Remove old images:**

```bash
docker image prune -a
```

**Remove unused volumes:**

```bash
docker volume prune
```

## Performance Tuning

### MongoDB Optimization

```javascript
// Create indexes
db.projects.createIndex({ projectId: 1 }, { unique: true });
db.projects.createIndex({ status: 1 });
db.generations.createIndex({ projectId: 1 });
```

### Backend Optimization

- Enable compression in Nginx
- Use CDN for static assets
- Implement caching strategies
- Optimize database queries

### Frontend Optimization

- Enable gzip compression
- Minimize bundle size
- Use lazy loading
- Implement service workers

## Support

For issues or questions:

- Check logs first
- Review error messages
- Consult documentation
- Contact support team

---

**Version:** 1.0.0  
**Last Updated:** January 2024
