import { Request, Response, NextFunction } from 'express';
import { performanceMonitor } from '../services/performanceMonitor';
import { logger } from '../utils/logger';

/**
 * Middleware to track API performance metrics
 */
export const apiPerformanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  const originalSend = res.send;

  // Override res.send to capture when response is sent
  res.send = function(body: any) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Record API performance data
    performanceMonitor.recordApiPerformance({
      endpoint: req.route?.path || req.path,
      method: req.method,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId || req.userId,
      timestamp: new Date(),
    });

    // Log slow requests
    if (duration > 2000) { // 2 seconds
      logger.warn(`Slow API request detected`, {
        method: req.method,
        path: req.path,
        duration,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
      });
    }

    // Call original send
    return originalSend.call(this, body);
  };

  next();
};

/**
 * Middleware to track database query performance
 */
export const createDatabasePerformanceWrapper = (originalMethod: Function, operation: string, collection: string) => {
  return function(this: any, ...args: any[]) {
    const startTime = process.hrtime.bigint();
    
    const result = originalMethod.apply(this, args);
    
    // Handle both sync and async operations
    if (result && typeof result.then === 'function') {
      return result.then((data: any) => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        
        performanceMonitor.recordDatabasePerformance({
          operation,
          collection,
          duration,
          documentsAffected: Array.isArray(data) ? data.length : 1,
          indexesUsed: [], // Would need to be extracted from explain() if available
          timestamp: new Date(),
        });
        
        return data;
      }).catch((error: any) => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        
        performanceMonitor.recordDatabasePerformance({
          operation: `${operation}_error`,
          collection,
          duration,
          documentsAffected: 0,
          indexesUsed: [],
          timestamp: new Date(),
        });
        
        throw error;
      });
    } else {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      performanceMonitor.recordDatabasePerformance({
        operation,
        collection,
        duration,
        documentsAffected: Array.isArray(result) ? result.length : 1,
        indexesUsed: [],
        timestamp: new Date(),
      });
      
      return result;
    }
  };
};

/**
 * Wrapper for GitHub API calls to track performance
 */
export const trackGitHubApiCall = async <T>(
  operation: string,
  apiCall: () => Promise<T>
): Promise<T> => {
  const timer = performanceMonitor.startTimer(`github_api_${operation}`);
  
  try {
    const result = await apiCall();
    const duration = timer();
    
    // Log GitHub API usage
    logger.debug(`GitHub API call completed`, {
      operation,
      duration,
      success: true,
    });
    
    return result;
  } catch (error) {
    const duration = timer();
    
    logger.error(`GitHub API call failed`, {
      operation,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw error;
  }
};

/**
 * Wrapper for analysis engine operations
 */
export const trackAnalysisOperation = async <T>(
  phase: string,
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> => {
  const timer = performanceMonitor.startTimer(`analysis_${phase}`);
  
  try {
    const result = await operation();
    const duration = timer();
    
    return { result, duration };
  } catch (error) {
    const duration = timer();
    
    logger.error(`Analysis operation failed`, {
      phase,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw error;
  }
};

/**
 * Memory usage tracking middleware
 */
export const memoryTrackingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const memBefore = process.memoryUsage();
  
  res.on('finish', () => {
    const memAfter = process.memoryUsage();
    const memDiff = {
      heapUsed: memAfter.heapUsed - memBefore.heapUsed,
      heapTotal: memAfter.heapTotal - memBefore.heapTotal,
      external: memAfter.external - memBefore.external,
    };
    
    // Log significant memory increases
    if (memDiff.heapUsed > 50 * 1024 * 1024) { // 50MB
      logger.warn(`High memory usage detected`, {
        endpoint: req.path,
        method: req.method,
        memoryIncrease: Math.round(memDiff.heapUsed / 1024 / 1024), // MB
        currentHeapUsed: Math.round(memAfter.heapUsed / 1024 / 1024), // MB
      });
    }
  });
  
  next();
};

/**
 * Error tracking middleware
 */
export const errorTrackingMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => {
  // Record error metrics
  performanceMonitor.recordMetric({
    name: 'api_error',
    value: 1,
    unit: 'count',
    timestamp: new Date(),
    metadata: {
      endpoint: req.path,
      method: req.method,
      errorType: error.name,
      errorMessage: error.message,
      statusCode: res.statusCode,
    },
  });
  
  logger.error(`API Error`, {
    endpoint: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId || req.userId,
  });
  
  next(error);
};

/**
 * Rate limiting tracking
 */
export const rateLimitTrackingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    if (res.statusCode === 429) {
      performanceMonitor.recordMetric({
        name: 'rate_limit_hit',
        value: 1,
        unit: 'count',
        timestamp: new Date(),
        metadata: {
          endpoint: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          userId: req.user?.userId || req.userId,
        },
      });
      
      logger.warn(`Rate limit hit`, {
        endpoint: req.path,
        method: req.method,
        userId: req.user?.userId || req.userId,
      });
    }
  });
  
  next();
};

export default {
  apiPerformanceMiddleware,
  createDatabasePerformanceWrapper,
  trackGitHubApiCall,
  trackAnalysisOperation,
  memoryTrackingMiddleware,
  errorTrackingMiddleware,
  rateLimitTrackingMiddleware,
};
