import { Router } from 'express';
import { performanceService } from '../services/performanceService';
import { cacheService } from '../services/cacheService';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { logger } from '../config/logger';

const router = Router();

/**
 * Get performance statistics
 * Requires admin role for detailed metrics
 */
router.get('/stats', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const stats = await performanceService.getCachedStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting performance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance statistics',
    });
  }
});

/**
 * Get cache statistics
 */
router.get('/cache', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const cacheStats = cacheService.getStats();
    const isHealthy = cacheService.isHealthy();
    
    res.json({
      success: true,
      data: {
        ...cacheStats,
        isHealthy,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics',
    });
  }
});

/**
 * Get system health metrics
 */
router.get('/health', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const systemHealth = performanceService.getSystemHealth();
    
    res.json({
      success: true,
      data: systemHealth,
    });
  } catch (error) {
    logger.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system health metrics',
    });
  }
});

/**
 * Get metrics for a specific operation
 */
router.get('/metrics/:operation', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { operation } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    
    const metrics = performanceService.getMetricsForOperation(operation, limit);
    const averageResponseTime = performanceService.getAverageResponseTime(operation);
    const p95ResponseTime = performanceService.getPercentileResponseTime(operation, 95);
    const p99ResponseTime = performanceService.getPercentileResponseTime(operation, 99);
    
    res.json({
      success: true,
      data: {
        operation,
        metrics,
        statistics: {
          count: metrics.length,
          averageResponseTime,
          p95ResponseTime,
          p99ResponseTime,
        },
      },
    });
  } catch (error) {
    logger.error('Error getting operation metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get operation metrics',
    });
  }
});

/**
 * Clear cache (admin only)
 */
router.delete('/cache', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pattern = req.query.pattern as string;
    const success = await cacheService.flush(pattern);
    
    if (success) {
      logger.info(`Cache cleared${pattern ? ` with pattern: ${pattern}` : ''}`);
      res.json({
        success: true,
        message: 'Cache cleared successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
      });
    }
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
    });
  }
});

/**
 * Reset performance statistics (admin only)
 */
router.delete('/stats', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    performanceService.reset();
    cacheService.resetStats();
    
    logger.info('Performance statistics reset');
    res.json({
      success: true,
      message: 'Performance statistics reset successfully',
    });
  } catch (error) {
    logger.error('Error resetting performance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset performance statistics',
    });
  }
});

/**
 * Export metrics for external monitoring systems
 */
router.get('/export', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const format = req.query.format as string || 'json';
    const exportData = performanceService.exportMetrics();
    
    if (format === 'prometheus') {
      // Convert to Prometheus format
      let prometheusMetrics = '';
      
      // Add basic metrics
      prometheusMetrics += `# HELP app_requests_total Total number of requests\n`;
      prometheusMetrics += `# TYPE app_requests_total counter\n`;
      prometheusMetrics += `app_requests_total ${exportData.stats.totalRequests}\n\n`;
      
      prometheusMetrics += `# HELP app_response_time_avg Average response time in milliseconds\n`;
      prometheusMetrics += `# TYPE app_response_time_avg gauge\n`;
      prometheusMetrics += `app_response_time_avg ${exportData.stats.averageResponseTime}\n\n`;
      
      prometheusMetrics += `# HELP app_error_rate Error rate percentage\n`;
      prometheusMetrics += `# TYPE app_error_rate gauge\n`;
      prometheusMetrics += `app_error_rate ${exportData.stats.errorRate}\n\n`;
      
      prometheusMetrics += `# HELP app_cache_hit_rate Cache hit rate percentage\n`;
      prometheusMetrics += `# TYPE app_cache_hit_rate gauge\n`;
      prometheusMetrics += `app_cache_hit_rate ${exportData.stats.cacheStats.hitRate}\n\n`;
      
      prometheusMetrics += `# HELP app_memory_usage_mb Memory usage in megabytes\n`;
      prometheusMetrics += `# TYPE app_memory_usage_mb gauge\n`;
      prometheusMetrics += `app_memory_usage_mb{type="rss"} ${exportData.stats.memoryUsage.rss}\n`;
      prometheusMetrics += `app_memory_usage_mb{type="heap_total"} ${exportData.stats.memoryUsage.heapTotal}\n`;
      prometheusMetrics += `app_memory_usage_mb{type="heap_used"} ${exportData.stats.memoryUsage.heapUsed}\n`;
      prometheusMetrics += `app_memory_usage_mb{type="external"} ${exportData.stats.memoryUsage.external}\n\n`;
      
      res.set('Content-Type', 'text/plain');
      res.send(prometheusMetrics);
    } else {
      res.json({
        success: true,
        data: exportData,
      });
    }
  } catch (error) {
    logger.error('Error exporting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export metrics',
    });
  }
});

/**
 * Get performance recommendations
 */
router.get('/recommendations', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const stats = await performanceService.getStats();
    const cacheStats = cacheService.getStats();
    const recommendations = [];
    
    // Analyze performance and generate recommendations
    if (stats.averageResponseTime > 1000) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        message: 'Average response time is above 1 second. Consider optimizing slow queries.',
        metric: 'averageResponseTime',
        value: stats.averageResponseTime,
      });
    }
    
    if (stats.errorRate > 5) {
      recommendations.push({
        type: 'reliability',
        severity: 'high',
        message: 'Error rate is above 5%. Investigate and fix recurring errors.',
        metric: 'errorRate',
        value: stats.errorRate,
      });
    }
    
    if (cacheStats.hitRate < 70) {
      recommendations.push({
        type: 'caching',
        severity: 'medium',
        message: 'Cache hit rate is below 70%. Consider caching more frequently accessed data.',
        metric: 'cacheHitRate',
        value: cacheStats.hitRate,
      });
    }
    
    if (stats.memoryUsage.heapUsed > 1000) {
      recommendations.push({
        type: 'memory',
        severity: 'medium',
        message: 'Heap memory usage is above 1GB. Monitor for memory leaks.',
        metric: 'heapUsed',
        value: stats.memoryUsage.heapUsed,
      });
    }
    
    if (stats.throughput < 10) {
      recommendations.push({
        type: 'throughput',
        severity: 'low',
        message: 'Request throughput is low. Consider scaling if needed.',
        metric: 'throughput',
        value: stats.throughput,
      });
    }
    
    res.json({
      success: true,
      data: {
        recommendations,
        timestamp: new Date().toISOString(),
        stats: {
          averageResponseTime: stats.averageResponseTime,
          errorRate: stats.errorRate,
          cacheHitRate: cacheStats.hitRate,
          memoryUsage: stats.memoryUsage,
          throughput: stats.throughput,
        },
      },
    });
  } catch (error) {
    logger.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance recommendations',
    });
  }
});

export default router;
