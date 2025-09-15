import express from 'express';
import { connectDatabase } from './config/database';
import { configureMiddleware } from './config/middleware';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { errorTrackingMiddleware } from './middleware/performanceMiddleware';

// Import routes
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import userRoutes from './routes/users';
import analysisRoutes from './routes/analysis';
import repositoryRoutes from './routes/repositories';
import monitoringRoutes from './routes/monitoring';
import performanceRoutes from './routes/performance';

export function createApp(): express.Application {
  const app = express();

  // Configure middleware
  configureMiddleware(app);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/analysis', analysisRoutes);
  app.use('/api/repositories', repositoryRoutes);
  app.use('/api/monitoring', monitoringRoutes);
  app.use('/api/performance', performanceRoutes);

  // API documentation endpoint
  app.get('/api', (req, res) => {
    res.json({
      name: 'GitHub Project Miner API',
      version: '1.0.0',
      description: 'API for discovering and analyzing abandoned GitHub repositories with revival potential',
      endpoints: {
        auth: '/api/auth',
        projects: '/api/projects',
        users: '/api/users',
        analysis: '/api/analysis',
        repositories: '/api/repositories',
        health: '/health',
      },
      documentation: 'https://github.com/GEMDevEng/GH_Gold_Mine/blob/main/docs/technical/api-reference.md',
    });
  });

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorTrackingMiddleware);
  app.use(errorHandler);

  return app;
}

export async function startServer(app: express.Application): Promise<void> {
  const PORT = process.env.PORT || 3000;

  try {
    // Try to connect to database, but don't fail if it's not available in development
    if (process.env.NODE_ENV === 'production') {
      await connectDatabase();
    } else {
      try {
        await connectDatabase();
        logger.info('✅ Connected to MongoDB');
      } catch (error) {
        logger.warn('⚠️  MongoDB not available, running without database connection');
        logger.warn('This is OK for development, but you\'ll need MongoDB for full functionality');
      }
    }

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API documentation available at http://localhost:${PORT}/api`);
      logger.info(`🏥 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

export function setupProcessHandlers(): void {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    process.exit(0);
  });
}
