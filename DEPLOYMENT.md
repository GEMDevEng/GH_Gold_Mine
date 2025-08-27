# GitHub Gold Mine - Deployment Guide

This guide covers the deployment of GitHub Gold Mine to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Production Setup](#production-setup)
- [Environment Configuration](#environment-configuration)
- [Deployment Process](#deployment-process)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04 LTS or later (recommended)
- **Memory**: Minimum 4GB RAM (8GB+ recommended for production)
- **Storage**: Minimum 20GB free space (50GB+ recommended)
- **CPU**: 2+ cores recommended
- **Network**: Public IP address and domain name (for SSL)

### Required Software

- Docker 20.10+
- Docker Compose 2.0+
- Git
- OpenSSL
- Nginx (for reverse proxy)
- Certbot (for SSL certificates)

## Quick Start

For a quick development deployment:

```bash
# Clone the repository
git clone https://github.com/GEMDevEng/GH_Gold_Mine.git
cd GH_Gold_Mine

# Copy environment template
cp backend/.env.example backend/.env.production

# Edit environment variables
nano backend/.env.production

# Deploy
./scripts/deploy.sh production
```

## Production Setup

### 1. Server Preparation

Run the production setup script to configure your server:

```bash
# Make the script executable
chmod +x scripts/setup-production.sh

# Run setup (replace yourdomain.com with your actual domain)
./scripts/setup-production.sh yourdomain.com
```

This script will:
- Install Docker and Docker Compose
- Configure firewall (UFW)
- Set up fail2ban for security
- Configure SSL certificates with Let's Encrypt
- Create application directories
- Set up log rotation
- Create systemd service

### 2. DNS Configuration

Point your domain to your server's IP address:

```
A    @              YOUR_SERVER_IP
A    www            YOUR_SERVER_IP
A    api            YOUR_SERVER_IP
```

## Environment Configuration

### Required Environment Variables

Edit `backend/.env.production` and configure the following:

```bash
# Database
MONGODB_URI=mongodb://username:password@host:port/database

# JWT Secrets (generated automatically by setup script)
JWT_SECRET=your_secure_jwt_secret
JWT_REFRESH_SECRET=your_secure_refresh_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Domain Configuration
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Redis (optional but recommended)
REDIS_URL=redis://username:password@host:port

# Monitoring (optional)
SENTRY_DSN=your_sentry_dsn
```

### GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App with:
   - Application name: GitHub Gold Mine
   - Homepage URL: `https://yourdomain.com`
   - Authorization callback URL: `https://api.yourdomain.com/api/auth/github/callback`
3. Copy the Client ID and Client Secret to your environment file

### Database Setup

#### Option 1: MongoDB Atlas (Recommended)

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Create a database user
4. Whitelist your server's IP address
5. Get the connection string and add it to `MONGODB_URI`

#### Option 2: Self-hosted MongoDB

The Docker Compose configuration includes MongoDB. Configure the credentials in your environment file.

## Deployment Process

### Automated Deployment

Use the deployment script for automated deployment:

```bash
# Deploy to production
./scripts/deploy.sh production

# Deploy to staging
./scripts/deploy.sh staging
```

### Manual Deployment

If you prefer manual deployment:

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### CI/CD with GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/ci-cd.yml`) that automatically:

- Runs tests on pull requests
- Deploys to staging on pushes to `develop` branch
- Deploys to production on pushes to `main` branch

#### Required GitHub Secrets

Add these secrets to your GitHub repository:

```
STAGING_GITHUB_CLIENT_ID
PRODUCTION_GITHUB_CLIENT_ID
MONGODB_URI
JWT_SECRET
JWT_REFRESH_SECRET
GITHUB_CLIENT_SECRET
REDIS_URL
```

## Monitoring and Maintenance

### Health Checks

The application includes comprehensive health checks:

```bash
# Check application health
curl http://localhost:3000/api/health

# Check individual services
docker-compose -f docker-compose.prod.yml ps
```

### Monitoring Stack

The deployment includes:

- **Prometheus**: Metrics collection (http://localhost:9090)
- **Grafana**: Metrics visualization (http://localhost:3002)
- **Loki**: Log aggregation
- **Promtail**: Log collection

Default Grafana credentials:
- Username: `admin`
- Password: Set via `GRAFANA_ADMIN_PASSWORD` environment variable

### Log Management

Logs are automatically rotated and can be viewed with:

```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs -f app

# All service logs
docker-compose -f docker-compose.prod.yml logs -f

# System logs
tail -f /var/log/gh-gold-mine/app.log
```

### Backup and Recovery

#### Automated Backups

Backups are automatically created before each deployment and can be configured to run on a schedule.

#### Manual Backup

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec mongodb mongodump --uri="$MONGODB_URI" --archive=/backup/manual_backup.gz --gzip

# Restore backup
docker-compose -f docker-compose.prod.yml exec mongodb mongorestore --uri="$MONGODB_URI" --archive=/backup/manual_backup.gz --gzip
```

### Updates and Maintenance

#### Application Updates

```bash
# Pull latest changes
git pull origin main

# Deploy updates
./scripts/deploy.sh production
```

#### System Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs app

# Check environment variables
docker-compose -f docker-compose.prod.yml exec app env | grep -E "(MONGODB|JWT|GITHUB)"
```

#### 2. Database Connection Issues

```bash
# Test MongoDB connection
docker-compose -f docker-compose.prod.yml exec app node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected'))
  .catch(err => console.error('Error:', err));
"
```

#### 3. SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Test certificate renewal
sudo certbot renew --dry-run
```

#### 4. Performance Issues

```bash
# Check resource usage
docker stats

# Check system resources
htop

# Check application metrics
curl http://localhost:3000/api/health
```

### Getting Help

If you encounter issues:

1. Check the application logs
2. Review the health check endpoint
3. Verify environment configuration
4. Check system resources
5. Review the troubleshooting section above

For additional support, please create an issue in the GitHub repository with:
- Error messages and logs
- System information
- Steps to reproduce the issue

## Security Considerations

- Keep all dependencies updated
- Regularly rotate JWT secrets
- Monitor access logs for suspicious activity
- Use strong passwords for all services
- Enable fail2ban for intrusion prevention
- Regularly backup your data
- Use HTTPS for all communications
- Limit database access to application servers only

## Performance Optimization

- Enable Redis caching
- Configure database indexes
- Use a CDN for static assets
- Monitor and optimize database queries
- Scale horizontally with multiple application instances
- Use connection pooling for database connections
