# Multi-stage build for production optimization

# Stage 1: Build backend
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY backend/ ./

# Build the application
RUN npm run build

# Stage 2: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY frontend/ ./

# Build arguments for environment-specific builds
ARG REACT_APP_API_URL
ARG REACT_APP_GITHUB_CLIENT_ID
ARG REACT_APP_ENVIRONMENT=production

# Set environment variables
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_GITHUB_CLIENT_ID=$REACT_APP_GITHUB_CLIENT_ID
ENV REACT_APP_ENVIRONMENT=$REACT_APP_ENVIRONMENT

# Build the application
RUN npm run build

# Stage 3: Production runtime
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built backend
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/dist ./backend/dist
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/package.json ./backend/

# Copy built frontend
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/build ./frontend/build

# Copy production configuration
COPY --chown=nextjs:nodejs backend/.env.production ./backend/.env.production

# Install serve for serving frontend
RUN npm install -g serve

# Create necessary directories
RUN mkdir -p /var/log/gh-gold-mine && \
    chown -R nextjs:nodejs /var/log/gh-gold-mine

# Switch to non-root user
USER nextjs

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node backend/dist/scripts/healthCheck.js

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start both backend and frontend
CMD ["sh", "-c", "serve -s frontend/build -l 3001 & cd backend && node dist/index.js"]
