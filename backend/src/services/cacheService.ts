import Redis from 'ioredis';
import { logger } from '../config/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  compress?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

class CacheService {
  private redis: Redis | null = null;
  private isConnected = false;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
  };

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      if (!process.env.REDIS_URL) {
        logger.info('Redis URL not configured, caching disabled');
        return;
      }

      this.redis = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        keyPrefix: 'gh_gold_mine:',
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });

      this.redis.on('error', (error) => {
        logger.error('Redis connection error:', error);
        this.isConnected = false;
        this.stats.errors++;
      });

      this.redis.on('close', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      this.redis.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      await this.redis.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.redis = null;
      this.isConnected = false;
    }
  }

  private generateKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || 'default';
    return `${finalPrefix}:${key}`;
  }

  private compress(data: string): string {
    // Simple compression using JSON.stringify for objects
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed);
    } catch {
      return data;
    }
  }

  private decompress(data: string): string {
    return data;
  }

  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.isConnected || !this.redis) {
      return null;
    }

    try {
      const cacheKey = this.generateKey(key, options.prefix);
      const cached = await this.redis.get(cacheKey);

      if (cached === null) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();

      const decompressed = options.compress ? this.decompress(cached) : cached;
      return JSON.parse(decompressed);
    } catch (error) {
      logger.error('Cache get error:', error);
      this.stats.errors++;
      return null;
    }
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(key, options.prefix);
      const serialized = JSON.stringify(value);
      const compressed = options.compress ? this.compress(serialized) : serialized;

      if (options.ttl) {
        await this.redis.setex(cacheKey, options.ttl, compressed);
      } else {
        await this.redis.set(cacheKey, compressed);
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(key, options.prefix);
      const result = await this.redis.del(cacheKey);
      
      if (result > 0) {
        this.stats.deletes++;
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Cache delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(key, options.prefix);
      const result = await this.redis.exists(cacheKey);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async flush(pattern?: string): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      if (pattern) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        await this.redis.flushdb();
      }
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async increment(key: string, amount = 1, options: CacheOptions = {}): Promise<number | null> {
    if (!this.isConnected || !this.redis) {
      return null;
    }

    try {
      const cacheKey = this.generateKey(key, options.prefix);
      const result = await this.redis.incrby(cacheKey, amount);
      
      if (options.ttl) {
        await this.redis.expire(cacheKey, options.ttl);
      }
      
      return result;
    } catch (error) {
      logger.error('Cache increment error:', error);
      this.stats.errors++;
      return null;
    }
  }

  async getOrSet<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T | null> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    try {
      // Fetch fresh data
      const fresh = await fetcher();
      
      // Cache the result
      await this.set(key, fresh, options);
      
      return fresh;
    } catch (error) {
      logger.error('Cache getOrSet fetcher error:', error);
      return null;
    }
  }

  async mget<T = any>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    if (!this.isConnected || !this.redis) {
      return keys.map(() => null);
    }

    try {
      const cacheKeys = keys.map(key => this.generateKey(key, options.prefix));
      const results = await this.redis.mget(...cacheKeys);
      
      return results.map((result, index) => {
        if (result === null) {
          this.stats.misses++;
          return null;
        }
        
        this.stats.hits++;
        try {
          const decompressed = options.compress ? this.decompress(result) : result;
          return JSON.parse(decompressed);
        } catch {
          return null;
        }
      });
    } catch (error) {
      logger.error('Cache mget error:', error);
      this.stats.errors++;
      return keys.map(() => null);
    } finally {
      this.updateHitRate();
    }
  }

  async mset(items: Array<{ key: string; value: any }>, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      const pipeline = this.redis.pipeline();
      
      for (const item of items) {
        const cacheKey = this.generateKey(item.key, options.prefix);
        const serialized = JSON.stringify(item.value);
        const compressed = options.compress ? this.compress(serialized) : serialized;
        
        if (options.ttl) {
          pipeline.setex(cacheKey, options.ttl, compressed);
        } else {
          pipeline.set(cacheKey, compressed);
        }
      }
      
      await pipeline.exec();
      this.stats.sets += items.length;
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      this.stats.errors++;
      return false;
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
    };
  }

  isHealthy(): boolean {
    return this.isConnected && this.redis !== null;
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
      this.redis = null;
      this.isConnected = false;
    }
  }
}

// Cache key generators for different data types
export const CacheKeys = {
  repository: (id: string) => `repository:${id}`,
  repositoryByName: (owner: string, repo: string) => `repository:${owner}:${repo}`,
  search: (query: string) => `search:${Buffer.from(query).toString('base64')}`,
  analysis: (repositoryId: string) => `analysis:${repositoryId}`,
  highPotential: (params: string) => `high_potential:${Buffer.from(params).toString('base64')}`,
  userJobs: (userId: string, page: number, limit: number) => `user_jobs:${userId}:${page}:${limit}`,
  stats: () => 'stats:global',
  rateLimit: (identifier: string) => `rate_limit:${identifier}`,
};

// Default TTL values (in seconds)
export const CacheTTL = {
  SHORT: 5 * 60,        // 5 minutes
  MEDIUM: 30 * 60,      // 30 minutes
  LONG: 2 * 60 * 60,    // 2 hours
  VERY_LONG: 24 * 60 * 60, // 24 hours
};

// Export singleton instance
export const cacheService = new CacheService();
