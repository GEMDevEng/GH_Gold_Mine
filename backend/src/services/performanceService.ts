import { performance } from 'perf_hooks';
import { logger } from '../config/logger';
import { cacheService, CacheKeys, CacheTTL } from './cacheService';

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  slowestRequests: PerformanceMetric[];
  fastestRequests: PerformanceMetric[];
  errorRate: number;
  throughput: number; // requests per second
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cacheStats: {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
  };
}

class PerformanceService {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000;
  private readonly slowRequestThreshold = 1000; // 1 second
  private startTime = Date.now();

  // Track request performance
  startTimer(name: string, metadata?: Record<string, any>): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata,
      });
    };
  }

  // Record a performance metric
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow requests
    if (metric.duration > this.slowRequestThreshold) {
      logger.warn('Slow request detected', {
        name: metric.name,
        duration: `${metric.duration.toFixed(2)}ms`,
        metadata: metric.metadata,
      });
    }
  }

  // Get performance statistics
  async getStats(): Promise<PerformanceStats> {
    const now = Date.now();
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < timeWindow);

    // Calculate basic stats
    const totalRequests = recentMetrics.length;
    const averageResponseTime = totalRequests > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests 
      : 0;

    // Get slowest and fastest requests
    const sortedByDuration = [...recentMetrics].sort((a, b) => b.duration - a.duration);
    const slowestRequests = sortedByDuration.slice(0, 10);
    const fastestRequests = sortedByDuration.slice(-10).reverse();

    // Calculate error rate (assuming errors are tracked separately)
    const errorMetrics = recentMetrics.filter(m => m.metadata?.error);
    const errorRate = totalRequests > 0 ? (errorMetrics.length / totalRequests) * 100 : 0;

    // Calculate throughput
    const throughput = totalRequests > 0 ? totalRequests / (timeWindow / 1000) : 0;

    // Get memory usage
    const memoryUsage = process.memoryUsage();

    // Get cache stats
    const cacheStats = cacheService.getStats();

    return {
      totalRequests,
      averageResponseTime,
      slowestRequests,
      fastestRequests,
      errorRate,
      throughput,
      memoryUsage: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
      },
      cacheStats: {
        hitRate: cacheStats.hitRate,
        totalHits: cacheStats.hits,
        totalMisses: cacheStats.misses,
      },
    };
  }

  // Get cached performance stats
  async getCachedStats(): Promise<PerformanceStats> {
    return cacheService.getOrSet(
      CacheKeys.stats(),
      () => this.getStats(),
      { ttl: CacheTTL.SHORT }
    ) as Promise<PerformanceStats>;
  }

  // Monitor database query performance
  monitorDatabaseQuery<T>(
    queryName: string,
    query: () => Promise<T>
  ): Promise<T> {
    const timer = this.startTimer(`db:${queryName}`);
    
    return query()
      .then(result => {
        timer();
        return result;
      })
      .catch(error => {
        timer();
        this.recordMetric({
          name: `db:${queryName}`,
          duration: 0,
          timestamp: Date.now(),
          metadata: { error: true, message: error.message },
        });
        throw error;
      });
  }

  // Monitor API endpoint performance
  monitorApiEndpoint<T>(
    endpoint: string,
    handler: () => Promise<T>
  ): Promise<T> {
    const timer = this.startTimer(`api:${endpoint}`);
    
    return handler()
      .then(result => {
        timer();
        return result;
      })
      .catch(error => {
        timer();
        this.recordMetric({
          name: `api:${endpoint}`,
          duration: 0,
          timestamp: Date.now(),
          metadata: { error: true, message: error.message },
        });
        throw error;
      });
  }

  // Monitor external service calls
  monitorExternalService<T>(
    serviceName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const timer = this.startTimer(`external:${serviceName}`);
    
    return operation()
      .then(result => {
        timer();
        return result;
      })
      .catch(error => {
        timer();
        this.recordMetric({
          name: `external:${serviceName}`,
          duration: 0,
          timestamp: Date.now(),
          metadata: { error: true, message: error.message },
        });
        throw error;
      });
  }

  // Get system health metrics
  getSystemHealth(): {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    loadAverage: number[];
  } {
    return {
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      loadAverage: require('os').loadavg(),
    };
  }

  // Clear old metrics
  clearOldMetrics(maxAge = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }

  // Get metrics for a specific operation
  getMetricsForOperation(operationName: string, limit = 100): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.name === operationName)
      .slice(-limit);
  }

  // Get average response time for an operation
  getAverageResponseTime(operationName: string, timeWindow = 5 * 60 * 1000): number {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(
      m => m.name === operationName && now - m.timestamp < timeWindow
    );

    if (recentMetrics.length === 0) return 0;

    return recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
  }

  // Get percentile response time
  getPercentileResponseTime(operationName: string, percentile: number, timeWindow = 5 * 60 * 1000): number {
    const now = Date.now();
    const recentMetrics = this.metrics
      .filter(m => m.name === operationName && now - m.timestamp < timeWindow)
      .map(m => m.duration)
      .sort((a, b) => a - b);

    if (recentMetrics.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * recentMetrics.length) - 1;
    return recentMetrics[Math.max(0, index)];
  }

  // Export metrics for external monitoring systems
  exportMetrics(): {
    metrics: PerformanceMetric[];
    stats: PerformanceStats;
    systemHealth: ReturnType<typeof this.getSystemHealth>;
  } {
    return {
      metrics: this.metrics,
      stats: this.getStats() as any, // Type assertion for async method
      systemHealth: this.getSystemHealth(),
    };
  }

  // Reset all metrics
  reset(): void {
    this.metrics = [];
    this.startTime = Date.now();
  }
}

// Middleware for automatic performance monitoring
export const performanceMiddleware = (req: any, res: any, next: any) => {
  const timer = performanceService.startTimer(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    timer();
    originalEnd.apply(this, args);
  };

  next();
};

// Export singleton instance
export const performanceService = new PerformanceService();
