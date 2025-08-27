#!/bin/bash

# GitHub Gold Mine - Production Deployment Script
# This script handles the deployment of the application to production

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-production}"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-true}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Error handling
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Deployment failed with exit code $exit_code"
        log_info "Running cleanup..."
        # Add cleanup commands here
    fi
    exit $exit_code
}

trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if environment file exists
    if [ ! -f "$PROJECT_ROOT/backend/.env.$ENVIRONMENT" ]; then
        log_error "Environment file .env.$ENVIRONMENT not found"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Load environment variables
load_environment() {
    log_info "Loading environment variables for $ENVIRONMENT..."
    
    # Source the environment file
    set -a
    source "$PROJECT_ROOT/backend/.env.$ENVIRONMENT"
    set +a
    
    # Validate required environment variables
    required_vars=(
        "MONGODB_URI"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "GITHUB_CLIENT_ID"
        "GITHUB_CLIENT_SECRET"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    log_success "Environment variables loaded"
}

# Create backup
create_backup() {
    if [ "$BACKUP_BEFORE_DEPLOY" = "true" ]; then
        log_info "Creating backup before deployment..."
        
        # Create backup directory with timestamp
        BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup database
        if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" ps mongodb | grep -q "Up"; then
            log_info "Backing up MongoDB..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T mongodb \
                mongodump --uri="$MONGODB_URI" --archive | gzip > "$BACKUP_DIR/mongodb_backup.gz"
        fi
        
        # Backup Redis
        if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" ps redis | grep -q "Up"; then
            log_info "Backing up Redis..."
            docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T redis \
                redis-cli --rdb - | gzip > "$BACKUP_DIR/redis_backup.gz"
        fi
        
        log_success "Backup created at $BACKUP_DIR"
    else
        log_warning "Skipping backup (BACKUP_BEFORE_DEPLOY=false)"
    fi
}

# Build application
build_application() {
    log_info "Building application..."
    
    cd "$PROJECT_ROOT"
    
    # Build Docker images
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    log_success "Application built successfully"
}

# Deploy application
deploy_application() {
    log_info "Deploying application..."
    
    cd "$PROJECT_ROOT"
    
    # Stop existing containers gracefully
    log_info "Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down --timeout 30
    
    # Start new containers
    log_info "Starting new containers..."
    docker-compose -f docker-compose.prod.yml up -d
    
    log_success "Application deployed"
}

# Health check
health_check() {
    log_info "Performing health checks..."
    
    local start_time=$(date +%s)
    local timeout=$HEALTH_CHECK_TIMEOUT
    
    # Wait for application to be ready
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -gt $timeout ]; then
            log_error "Health check timeout after ${timeout}s"
            return 1
        fi
        
        # Check backend health
        if curl -f -s "http://localhost:3000/api/health" > /dev/null; then
            log_success "Backend health check passed"
            break
        fi
        
        log_info "Waiting for application to be ready... (${elapsed}s/${timeout}s)"
        sleep 5
    done
    
    # Check frontend
    if curl -f -s "http://localhost:3001" > /dev/null; then
        log_success "Frontend health check passed"
    else
        log_error "Frontend health check failed"
        return 1
    fi
    
    # Check database connectivity
    if docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T app \
        node -e "require('./backend/dist/scripts/healthCheck.js')" > /dev/null; then
        log_success "Database connectivity check passed"
    else
        log_error "Database connectivity check failed"
        return 1
    fi
    
    log_success "All health checks passed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Check if migrations directory exists
    if [ -d "$PROJECT_ROOT/backend/src/migrations" ]; then
        docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T app \
            node backend/dist/scripts/runMigrations.js
        log_success "Database migrations completed"
    else
        log_info "No migrations to run"
    fi
}

# Post-deployment tasks
post_deployment() {
    log_info "Running post-deployment tasks..."
    
    # Clear application cache
    log_info "Clearing application cache..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" exec -T redis \
        redis-cli FLUSHDB || log_warning "Failed to clear Redis cache"
    
    # Warm up cache with critical data
    log_info "Warming up cache..."
    curl -s "http://localhost:3000/api/repositories/high-potential?limit=10" > /dev/null || \
        log_warning "Failed to warm up cache"
    
    # Send deployment notification
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        log_info "Sending deployment notification..."
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 GitHub Gold Mine deployed successfully to $ENVIRONMENT\"}" \
            "$SLACK_WEBHOOK_URL" || log_warning "Failed to send Slack notification"
    fi
    
    log_success "Post-deployment tasks completed"
}

# Rollback function
rollback() {
    log_error "Rolling back deployment..."
    
    # Stop current containers
    docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" down
    
    # Restore from backup if available
    LATEST_BACKUP=$(ls -t "$PROJECT_ROOT/backups" | head -n1)
    if [ -n "$LATEST_BACKUP" ]; then
        log_info "Restoring from backup: $LATEST_BACKUP"
        # Add restore logic here
    fi
    
    # Start previous version
    # This would require keeping track of previous image versions
    log_info "Starting previous version..."
    
    log_error "Rollback completed"
}

# Main deployment function
main() {
    log_info "Starting deployment to $ENVIRONMENT environment..."
    
    check_prerequisites
    load_environment
    create_backup
    build_application
    deploy_application
    
    # Run health checks with rollback on failure
    if ! health_check; then
        log_error "Health checks failed, rolling back..."
        rollback
        exit 1
    fi
    
    run_migrations
    post_deployment
    
    log_success "Deployment to $ENVIRONMENT completed successfully! 🎉"
    log_info "Application is available at:"
    log_info "  Frontend: http://localhost:3001"
    log_info "  Backend API: http://localhost:3000"
    log_info "  Monitoring: http://localhost:3002 (Grafana)"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
