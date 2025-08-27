import express from 'express';
import { performanceMonitor } from '../services/performanceMonitor';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /api/monitoring/health
 * Basic health check endpoint
 */
router.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      },
      version: process.env.npm_package_version || '1.0.0',
    },
  });
});

/**
 * GET /api/monitoring/metrics
 * Get performance metrics (requires authentication)
 */
router.get('/metrics', authMiddleware, (req, res) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow as string) || 3600000; // Default 1 hour
    const stats = performanceMonitor.getPerformanceStats(timeWindow);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics',
    });
  }
});

/**
 * GET /api/monitoring/analysis-baseline
 * Get analysis engine baseline metrics
 */
router.get('/analysis-baseline', authMiddleware, (req, res) => {
  try {
    const baseline = performanceMonitor.getAnalysisEngineBaseline();
    
    res.json({
      success: true,
      data: baseline,
    });
  } catch (error) {
    logger.error('Failed to get analysis baseline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analysis baseline',
    });
  }
});

/**
 * GET /api/monitoring/system-stats
 * Get current system statistics
 */
router.get('/system-stats', authMiddleware, (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();
    
    res.json({
      success: true,
      data: {
        memory: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss,
          heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
          externalMB: Math.round(memUsage.external / 1024 / 1024),
          rssMB: Math.round(memUsage.rss / 1024 / 1024),
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        uptime: {
          seconds: uptime,
          formatted: formatUptime(uptime),
        },
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    });
  } catch (error) {
    logger.error('Failed to get system stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system stats',
    });
  }
});

/**
 * GET /api/monitoring/database-performance
 * Get database performance metrics
 */
router.get('/database-performance', authMiddleware, (req, res) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow as string) || 3600000; // Default 1 hour
    const stats = performanceMonitor.getPerformanceStats(timeWindow);
    
    res.json({
      success: true,
      data: {
        database: stats.database,
        timeWindow: stats.timeWindow,
      },
    });
  } catch (error) {
    logger.error('Failed to get database performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get database performance',
    });
  }
});

/**
 * GET /api/monitoring/api-performance
 * Get API performance metrics
 */
router.get('/api-performance', authMiddleware, (req, res) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow as string) || 3600000; // Default 1 hour
    const stats = performanceMonitor.getPerformanceStats(timeWindow);
    
    res.json({
      success: true,
      data: {
        api: stats.api,
        timeWindow: stats.timeWindow,
      },
    });
  } catch (error) {
    logger.error('Failed to get API performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API performance',
    });
  }
});

/**
 * POST /api/monitoring/test-performance
 * Test endpoint to generate performance data (development only)
 */
router.post('/test-performance', authMiddleware, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Test endpoints not available in production',
    });
  }

  try {
    // Simulate some work
    const timer = performanceMonitor.startTimer('test_operation');
    
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 100));
    
    const duration = timer();
    
    // Record test analysis performance
    performanceMonitor.recordAnalysisPerformance({
      repositoryId: 'test-repo-id',
      repositoryName: 'test/repository',
      totalDuration: duration,
      phases: {
        dataCollection: duration * 0.3,
        codeQualityAnalysis: duration * 0.25,
        revivalPotentialScoring: duration * 0.2,
        businessEvaluation: duration * 0.15,
        recommendationGeneration: duration * 0.1,
      },
      githubApiCalls: Math.floor(Math.random() * 10) + 1,
      githubApiDuration: duration * 0.4,
      databaseQueries: Math.floor(Math.random() * 5) + 1,
      databaseDuration: duration * 0.1,
      memoryUsage: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
      },
      success: Math.random() > 0.1, // 90% success rate
      errorType: Math.random() > 0.9 ? 'github_api_error' : undefined,
      timestamp: new Date(),
    });
    
    res.json({
      success: true,
      data: {
        message: 'Test performance data generated',
        duration,
      },
    });
  } catch (error) {
    logger.error('Failed to generate test performance data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate test performance data',
    });
  }
});

/**
 * GET /api/monitoring/alerts
 * Get performance alerts and warnings
 */
router.get('/alerts', authMiddleware, (req, res) => {
  try {
    const stats = performanceMonitor.getPerformanceStats(3600000); // Last hour
    const alerts = [];

    // Check for performance issues
    if (stats.analysis.averageDuration > 20000) {
      alerts.push({
        type: 'warning',
        category: 'analysis_performance',
        message: `Average analysis duration is high: ${Math.round(stats.analysis.averageDuration)}ms`,
        threshold: 20000,
        current: stats.analysis.averageDuration,
      });
    }

    if (stats.database.slowQueries > 0) {
      alerts.push({
        type: 'warning',
        category: 'database_performance',
        message: `${stats.database.slowQueries} slow database queries detected`,
        threshold: 0,
        current: stats.database.slowQueries,
      });
    }

    if (stats.api.slowRequests > 0) {
      alerts.push({
        type: 'warning',
        category: 'api_performance',
        message: `${stats.api.slowRequests} slow API requests detected`,
        threshold: 0,
        current: stats.api.slowRequests,
      });
    }

    if (stats.analysis.successRate < 95) {
      alerts.push({
        type: 'error',
        category: 'analysis_reliability',
        message: `Analysis success rate is low: ${stats.analysis.successRate.toFixed(1)}%`,
        threshold: 95,
        current: stats.analysis.successRate,
      });
    }

    // Check system resources
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    if (heapUsedMB > 500) { // 500MB threshold
      alerts.push({
        type: 'warning',
        category: 'memory_usage',
        message: `High memory usage: ${heapUsedMB}MB`,
        threshold: 500,
        current: heapUsedMB,
      });
    }

    res.json({
      success: true,
      data: {
        alerts,
        alertCount: alerts.length,
        lastChecked: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to get alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts',
    });
  }
});

/**
 * Utility function to format uptime
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);
  
  return parts.join(' ') || '0s';
}

export default router;
