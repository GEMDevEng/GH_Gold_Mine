#!/bin/bash

# GitHub Gold Mine - Production Environment Setup Script
# This script sets up the production environment with all necessary configurations

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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

# Generate secure random string
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Install system dependencies
install_dependencies() {
    log_info "Installing system dependencies..."
    
    # Update package list
    sudo apt-get update
    
    # Install required packages
    sudo apt-get install -y \
        curl \
        wget \
        gnupg \
        lsb-release \
        ca-certificates \
        software-properties-common \
        ufw \
        fail2ban \
        logrotate \
        htop \
        nginx \
        certbot \
        python3-certbot-nginx
    
    log_success "System dependencies installed"
}

# Install Docker
install_docker() {
    log_info "Installing Docker..."
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package list and install Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    log_success "Docker installed successfully"
    log_warning "Please log out and log back in for Docker group changes to take effect"
}

# Install Docker Compose
install_docker_compose() {
    log_info "Installing Docker Compose..."
    
    # Download Docker Compose
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # Make it executable
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Create symlink
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log_success "Docker Compose installed successfully"
}

# Configure firewall
configure_firewall() {
    log_info "Configuring firewall..."
    
    # Reset UFW to defaults
    sudo ufw --force reset
    
    # Set default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH
    sudo ufw allow ssh
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow application ports (only from localhost for security)
    sudo ufw allow from 127.0.0.1 to any port 3000  # Backend API
    sudo ufw allow from 127.0.0.1 to any port 3001  # Frontend
    sudo ufw allow from 127.0.0.1 to any port 3002  # Grafana
    sudo ufw allow from 127.0.0.1 to any port 9090  # Prometheus
    
    # Enable firewall
    sudo ufw --force enable
    
    log_success "Firewall configured"
}

# Configure fail2ban
configure_fail2ban() {
    log_info "Configuring fail2ban..."
    
    # Create custom jail configuration
    sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 6

[nginx-badbots]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2

[nginx-noproxy]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF
    
    # Restart fail2ban
    sudo systemctl restart fail2ban
    sudo systemctl enable fail2ban
    
    log_success "Fail2ban configured"
}

# Setup SSL certificates
setup_ssl() {
    local domain="${1:-}"
    
    if [ -z "$domain" ]; then
        log_warning "No domain provided, skipping SSL setup"
        log_info "You can run 'sudo certbot --nginx -d yourdomain.com' later to set up SSL"
        return
    fi
    
    log_info "Setting up SSL certificate for $domain..."
    
    # Obtain SSL certificate
    sudo certbot --nginx -d "$domain" --non-interactive --agree-tos --email "admin@$domain"
    
    # Set up automatic renewal
    sudo systemctl enable certbot.timer
    
    log_success "SSL certificate configured for $domain"
}

# Create application directories
create_directories() {
    log_info "Creating application directories..."
    
    # Create directories with proper permissions
    sudo mkdir -p /var/log/gh-gold-mine
    sudo mkdir -p /var/lib/gh-gold-mine/backups
    sudo mkdir -p /etc/gh-gold-mine
    
    # Set ownership
    sudo chown -R $USER:$USER /var/log/gh-gold-mine
    sudo chown -R $USER:$USER /var/lib/gh-gold-mine
    sudo chown -R $USER:$USER /etc/gh-gold-mine
    
    log_success "Application directories created"
}

# Generate environment configuration
generate_env_config() {
    log_info "Generating production environment configuration..."
    
    local env_file="$PROJECT_ROOT/backend/.env.production"
    
    # Generate secure secrets
    local jwt_secret=$(generate_secret)
    local jwt_refresh_secret=$(generate_secret)
    local session_secret=$(generate_secret)
    
    # Create environment file from template
    cp "$PROJECT_ROOT/backend/.env.production" "$PROJECT_ROOT/backend/.env.production.backup" 2>/dev/null || true
    
    # Update secrets in environment file
    sed -i "s/CHANGE_THIS_TO_A_SECURE_SECRET_AT_LEAST_32_CHARACTERS_LONG/$jwt_secret/g" "$env_file"
    sed -i "s/CHANGE_THIS_TO_A_DIFFERENT_SECURE_SECRET_AT_LEAST_32_CHARACTERS_LONG/$jwt_refresh_secret/g" "$env_file"
    sed -i "s/CHANGE_THIS_TO_A_SECURE_SESSION_SECRET/$session_secret/g" "$env_file"
    
    log_success "Environment configuration generated"
    log_warning "Please review and update $env_file with your specific configuration"
}

# Setup log rotation
setup_log_rotation() {
    log_info "Setting up log rotation..."
    
    sudo tee /etc/logrotate.d/gh-gold-mine > /dev/null <<EOF
/var/log/gh-gold-mine/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        docker-compose -f $PROJECT_ROOT/docker-compose.prod.yml restart app > /dev/null 2>&1 || true
    endscript
}
EOF
    
    log_success "Log rotation configured"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring configuration..."
    
    # Create monitoring configuration directory
    mkdir -p "$PROJECT_ROOT/config/grafana/dashboards"
    mkdir -p "$PROJECT_ROOT/config/grafana/datasources"
    
    # Create basic Grafana datasource configuration
    cat > "$PROJECT_ROOT/config/grafana/datasources/prometheus.yml" <<EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF
    
    log_success "Monitoring configuration created"
}

# Create systemd service
create_systemd_service() {
    log_info "Creating systemd service..."
    
    sudo tee /etc/systemd/system/gh-gold-mine.service > /dev/null <<EOF
[Unit]
Description=GitHub Gold Mine Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_ROOT
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0
User=$USER
Group=$USER

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable gh-gold-mine.service
    
    log_success "Systemd service created and enabled"
}

# Main setup function
main() {
    local domain="${1:-}"
    
    log_info "Starting production environment setup..."
    
    check_root
    install_dependencies
    install_docker
    install_docker_compose
    configure_firewall
    configure_fail2ban
    create_directories
    generate_env_config
    setup_log_rotation
    setup_monitoring
    create_systemd_service
    
    if [ -n "$domain" ]; then
        setup_ssl "$domain"
    fi
    
    log_success "Production environment setup completed! 🎉"
    log_info ""
    log_info "Next steps:"
    log_info "1. Review and update the environment configuration in backend/.env.production"
    log_info "2. Configure your domain DNS to point to this server"
    log_info "3. Run the deployment script: ./scripts/deploy.sh production"
    log_info "4. Monitor the application logs: docker-compose -f docker-compose.prod.yml logs -f"
    log_info ""
    log_warning "Please log out and log back in for Docker group changes to take effect"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
