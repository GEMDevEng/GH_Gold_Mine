import mongoose from 'mongoose';
import { createClient } from 'redis';
import { logger } from '../config/logger';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      error?: string;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      error?: string;
    };
    memory: {
      status: 'healthy' | 'unhealthy';
      usage: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
      };
      percentage: number;
    };
    disk: {
      status: 'healthy' | 'unhealthy';
      available: number;
      percentage: number;
    };
  };
}

class HealthChecker {
  private readonly maxMemoryUsage = 0.9; // 90%
  private readonly maxDiskUsage = 0.9; // 90%
  private readonly maxResponseTime = 5000; // 5 seconds

  async checkDatabase(): Promise<HealthCheckResult['checks']['database']> {
    const startTime = Date.now();
    
    try {
      // Check if mongoose is connected
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }

      // Perform a simple query to test connectivity
      await mongoose.connection.db.admin().ping();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < this.maxResponseTime ? 'healthy' : 'unhealthy',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  async checkRedis(): Promise<HealthCheckResult['checks']['redis']> {
    const startTime = Date.now();
    
    try {
      if (!process.env.REDIS_URL) {
        return {
          status: 'healthy', // Redis is optional
          responseTime: 0,
        };
      }

      const client = createClient({
        url: process.env.REDIS_URL,
      });

      await client.connect();
      await client.ping();
      await client.disconnect();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < this.maxResponseTime ? 'healthy' : 'unhealthy',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown Redis error',
      };
    }
  }

  checkMemory(): HealthCheckResult['checks']['memory'] {
    const usage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const percentage = usage.rss / totalMemory;
    
    return {
      status: percentage < this.maxMemoryUsage ? 'healthy' : 'unhealthy',
      usage: {
        rss: Math.round(usage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
        external: Math.round(usage.external / 1024 / 1024), // MB
      },
      percentage: Math.round(percentage * 100) / 100,
    };
  }

  async checkDisk(): Promise<HealthCheckResult['checks']['disk']> {
    try {
      const fs = require('fs').promises;
      const stats = await fs.statvfs(process.cwd());
      
      const available = stats.bavail * stats.frsize;
      const total = stats.blocks * stats.frsize;
      const used = total - available;
      const percentage = used / total;
      
      return {
        status: percentage < this.maxDiskUsage ? 'healthy' : 'unhealthy',
        available: Math.round(available / 1024 / 1024 / 1024), // GB
        percentage: Math.round(percentage * 100) / 100,
      };
    } catch (error) {
      // Fallback for systems that don't support statvfs
      return {
        status: 'healthy', // Assume healthy if we can't check
        available: 0,
        percentage: 0,
      };
    }
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Run all health checks in parallel
      const [database, redis, disk] = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkDisk(),
      ]);

      const memory = this.checkMemory();

      // Determine overall status
      const allChecks = [database, redis, memory, disk];
      const overallStatus = allChecks.every(check => check.status === 'healthy') 
        ? 'healthy' 
        : 'unhealthy';

      const result: HealthCheckResult = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks: {
          database,
          redis,
          memory,
          disk,
        },
      };

      // Log health check result
      if (overallStatus === 'healthy') {
        logger.debug('Health check passed', { 
          responseTime: Date.now() - startTime,
          checks: Object.keys(result.checks).reduce((acc, key) => {
            acc[key] = result.checks[key as keyof typeof result.checks].status;
            return acc;
          }, {} as Record<string, string>)
        });
      } else {
        logger.warn('Health check failed', { 
          responseTime: Date.now() - startTime,
          failedChecks: Object.entries(result.checks)
            .filter(([, check]) => check.status === 'unhealthy')
            .map(([name, check]) => ({ name, error: check.error }))
        });
      }

      return result;
    } catch (error) {
      logger.error('Health check error:', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks: {
          database: { status: 'unhealthy', responseTime: 0, error: 'Health check failed' },
          redis: { status: 'unhealthy', responseTime: 0, error: 'Health check failed' },
          memory: { status: 'unhealthy', usage: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 }, percentage: 0 },
          disk: { status: 'unhealthy', available: 0, percentage: 0 },
        },
      };
    }
  }
}

// Export for use in other modules
export const healthChecker = new HealthChecker();

// CLI usage
if (require.main === module) {
  const runHealthCheck = async () => {
    try {
      // Connect to database if not already connected
      if (mongoose.connection.readyState === 0) {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gh_gold_mine';
        await mongoose.connect(mongoUri);
      }

      const result = await healthChecker.performHealthCheck();
      
      // Output result
      console.log(JSON.stringify(result, null, 2));
      
      // Exit with appropriate code
      process.exit(result.status === 'healthy' ? 0 : 1);
    } catch (error) {
      console.error('Health check failed:', error);
      process.exit(1);
    } finally {
      // Close database connection
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
      }
    }
  };

  runHealthCheck();
}
