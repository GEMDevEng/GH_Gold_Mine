import { logger } from '../utils/logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AnalysisPerformanceData {
  repositoryId: string;
  repositoryName: string;
  totalDuration: number;
  phases: {
    dataCollection: number;
    codeQualityAnalysis: number;
    revivalPotentialScoring: number;
    businessEvaluation: number;
    recommendationGeneration: number;
  };
  githubApiCalls: number;
  githubApiDuration: number;
  databaseQueries: number;
  databaseDuration: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  success: boolean;
  errorType?: string;
  timestamp: Date;
}

export interface DatabasePerformanceData {
  operation: string;
  collection: string;
  duration: number;
  documentsAffected: number;
  indexesUsed: string[];
  queryPlan?: any;
  timestamp: Date;
}

export interface ApiPerformanceData {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  userAgent?: string;
  userId?: string;
  timestamp: Date;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private analysisMetrics: AnalysisPerformanceData[] = [];
  private databaseMetrics: DatabasePerformanceData[] = [];
  private apiMetrics: ApiPerformanceData[] = [];
  private maxMetricsRetention = 10000; // Keep last 10k metrics

  /**
   * Start timing an operation
   */
  startTimer(name: string): () => number {
    const startTime = process.hrtime.bigint();
    
    return () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        timestamp: new Date(),
      });
      
      return duration;
    };
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Cleanup old metrics
    if (this.metrics.length > this.maxMetricsRetention) {
      this.metrics = this.metrics.slice(-this.maxMetricsRetention);
    }

    // Log significant performance issues
    if (this.isSignificantMetric(metric)) {
      logger.warn(`Performance alert: ${metric.name} took ${metric.value}${metric.unit}`, {
        metric,
      });
    }
  }

  /**
   * Record analysis performance data
   */
  recordAnalysisPerformance(data: AnalysisPerformanceData): void {
    this.analysisMetrics.push(data);
    
    // Cleanup old metrics
    if (this.analysisMetrics.length > this.maxMetricsRetention) {
      this.analysisMetrics = this.analysisMetrics.slice(-this.maxMetricsRetention);
    }

    // Log analysis performance
    logger.info(`Analysis completed for ${data.repositoryName}`, {
      duration: data.totalDuration,
      success: data.success,
      githubApiCalls: data.githubApiCalls,
      databaseQueries: data.databaseQueries,
    });

    // Alert on slow analyses
    if (data.totalDuration > 30000) { // 30 seconds
      logger.warn(`Slow analysis detected: ${data.repositoryName} took ${data.totalDuration}ms`);
    }
  }

  /**
   * Record database performance data
   */
  recordDatabasePerformance(data: DatabasePerformanceData): void {
    this.databaseMetrics.push(data);
    
    // Cleanup old metrics
    if (this.databaseMetrics.length > this.maxMetricsRetention) {
      this.databaseMetrics = this.databaseMetrics.slice(-this.maxMetricsRetention);
    }

    // Alert on slow queries
    if (data.duration > 1000) { // 1 second
      logger.warn(`Slow database query detected`, {
        operation: data.operation,
        collection: data.collection,
        duration: data.duration,
        documentsAffected: data.documentsAffected,
      });
    }
  }

  /**
   * Record API performance data
   */
  recordApiPerformance(data: ApiPerformanceData): void {
    this.apiMetrics.push(data);
    
    // Cleanup old metrics
    if (this.apiMetrics.length > this.maxMetricsRetention) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetricsRetention);
    }

    // Alert on slow API responses
    if (data.duration > 5000) { // 5 seconds
      logger.warn(`Slow API response detected`, {
        endpoint: data.endpoint,
        method: data.method,
        duration: data.duration,
        statusCode: data.statusCode,
      });
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(timeWindow: number = 3600000): any { // Default 1 hour
    const cutoff = new Date(Date.now() - timeWindow);
    
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);
    const recentAnalyses = this.analysisMetrics.filter(m => m.timestamp >= cutoff);
    const recentDbQueries = this.databaseMetrics.filter(m => m.timestamp >= cutoff);
    const recentApiCalls = this.apiMetrics.filter(m => m.timestamp >= cutoff);

    return {
      timeWindow: timeWindow / 1000 / 60, // Convert to minutes
      general: this.calculateGeneralStats(recentMetrics),
      analysis: this.calculateAnalysisStats(recentAnalyses),
      database: this.calculateDatabaseStats(recentDbQueries),
      api: this.calculateApiStats(recentApiCalls),
      system: this.getSystemStats(),
    };
  }

  /**
   * Get analysis engine baseline metrics
   */
  getAnalysisEngineBaseline(): any {
    const last24Hours = this.analysisMetrics.filter(
      m => m.timestamp >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    if (last24Hours.length === 0) {
      return {
        message: 'No analysis data available for baseline calculation',
        sampleSize: 0,
      };
    }

    const successful = last24Hours.filter(m => m.success);
    const failed = last24Hours.filter(m => !m.success);

    return {
      sampleSize: last24Hours.length,
      successRate: (successful.length / last24Hours.length) * 100,
      averageDuration: this.calculateAverage(successful.map(m => m.totalDuration)),
      medianDuration: this.calculateMedian(successful.map(m => m.totalDuration)),
      p95Duration: this.calculatePercentile(successful.map(m => m.totalDuration), 95),
      phases: {
        dataCollection: this.calculateAverage(successful.map(m => m.phases.dataCollection)),
        codeQualityAnalysis: this.calculateAverage(successful.map(m => m.phases.codeQualityAnalysis)),
        revivalPotentialScoring: this.calculateAverage(successful.map(m => m.phases.revivalPotentialScoring)),
        businessEvaluation: this.calculateAverage(successful.map(m => m.phases.businessEvaluation)),
        recommendationGeneration: this.calculateAverage(successful.map(m => m.phases.recommendationGeneration)),
      },
      githubApi: {
        averageCalls: this.calculateAverage(successful.map(m => m.githubApiCalls)),
        averageDuration: this.calculateAverage(successful.map(m => m.githubApiDuration)),
      },
      database: {
        averageQueries: this.calculateAverage(successful.map(m => m.databaseQueries)),
        averageDuration: this.calculateAverage(successful.map(m => m.databaseDuration)),
      },
      errors: {
        count: failed.length,
        rate: (failed.length / last24Hours.length) * 100,
        types: this.groupBy(failed, 'errorType'),
      },
    };
  }

  /**
   * Check if a metric is significant enough to alert on
   */
  private isSignificantMetric(metric: PerformanceMetric): boolean {
    const thresholds: Record<string, number> = {
      'github_api_call': 5000, // 5 seconds
      'database_query': 1000, // 1 second
      'analysis_total': 30000, // 30 seconds
      'revival_scoring': 10000, // 10 seconds
      'code_quality_analysis': 15000, // 15 seconds
    };

    return metric.value > (thresholds[metric.name] || 10000);
  }

  /**
   * Calculate general statistics for metrics
   */
  private calculateGeneralStats(metrics: PerformanceMetric[]): any {
    if (metrics.length === 0) return { count: 0 };

    const values = metrics.map(m => m.value);
    return {
      count: metrics.length,
      average: this.calculateAverage(values),
      median: this.calculateMedian(values),
      min: Math.min(...values),
      max: Math.max(...values),
      p95: this.calculatePercentile(values, 95),
    };
  }

  /**
   * Calculate analysis-specific statistics
   */
  private calculateAnalysisStats(analyses: AnalysisPerformanceData[]): any {
    if (analyses.length === 0) return { count: 0 };

    const successful = analyses.filter(a => a.success);
    const durations = successful.map(a => a.totalDuration);

    return {
      count: analyses.length,
      successRate: (successful.length / analyses.length) * 100,
      averageDuration: this.calculateAverage(durations),
      medianDuration: this.calculateMedian(durations),
      p95Duration: this.calculatePercentile(durations, 95),
      averageGithubCalls: this.calculateAverage(successful.map(a => a.githubApiCalls)),
      averageDbQueries: this.calculateAverage(successful.map(a => a.databaseQueries)),
    };
  }

  /**
   * Calculate database-specific statistics
   */
  private calculateDatabaseStats(queries: DatabasePerformanceData[]): any {
    if (queries.length === 0) return { count: 0 };

    const durations = queries.map(q => q.duration);
    const collections = this.groupBy(queries, 'collection');

    return {
      count: queries.length,
      averageDuration: this.calculateAverage(durations),
      medianDuration: this.calculateMedian(durations),
      p95Duration: this.calculatePercentile(durations, 95),
      slowQueries: queries.filter(q => q.duration > 1000).length,
      collectionStats: Object.entries(collections).map(([collection, queries]) => ({
        collection,
        count: queries.length,
        averageDuration: this.calculateAverage(queries.map(q => q.duration)),
      })),
    };
  }

  /**
   * Calculate API-specific statistics
   */
  private calculateApiStats(apiCalls: ApiPerformanceData[]): any {
    if (apiCalls.length === 0) return { count: 0 };

    const durations = apiCalls.map(a => a.duration);
    const endpoints = this.groupBy(apiCalls, 'endpoint');
    const statusCodes = this.groupBy(apiCalls, 'statusCode');

    return {
      count: apiCalls.length,
      averageDuration: this.calculateAverage(durations),
      medianDuration: this.calculateMedian(durations),
      p95Duration: this.calculatePercentile(durations, 95),
      slowRequests: apiCalls.filter(a => a.duration > 5000).length,
      endpointStats: Object.entries(endpoints).slice(0, 10).map(([endpoint, calls]) => ({
        endpoint,
        count: calls.length,
        averageDuration: this.calculateAverage(calls.map(c => c.duration)),
      })),
      statusCodeDistribution: statusCodes,
    };
  }

  /**
   * Get current system statistics
   */
  private getSystemStats(): any {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: Math.round(process.uptime()),
    };
  }

  /**
   * Utility functions
   */
  private calculateAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      groups[groupKey] = groups[groupKey] || [];
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
}

export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;
