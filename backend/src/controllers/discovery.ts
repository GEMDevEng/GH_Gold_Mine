import { Response } from 'express';
import { logger } from '../config/logger';
import { discoveryEngine } from '../services/discoveryEngine';
import { dataCollectionPipeline } from '../services/dataCollectionPipeline';
import { cacheService, CacheKeys, CacheTTL } from '../services/cacheService';
import { RepositorySearchFilters } from '../types/github';

export class DiscoveryController {
  /**
   * Search repositories with filters
   */
  async searchRepositories(req: any, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const filters: RepositorySearchFilters = {
        query: req.query.query as string,
        language: req.query.language as string,
        minStars: req.query.minStars ? parseInt(req.query.minStars as string) : undefined,
        maxStars: req.query.maxStars ? parseInt(req.query.maxStars as string) : undefined,
        minForks: req.query.minForks ? parseInt(req.query.minForks as string) : undefined,
        maxForks: req.query.maxForks ? parseInt(req.query.maxForks as string) : undefined,
        lastCommitBefore: req.query.lastCommitBefore ? new Date(req.query.lastCommitBefore as string) : undefined,
        lastCommitAfter: req.query.lastCommitAfter ? new Date(req.query.lastCommitAfter as string) : undefined,
        hasIssues: req.query.hasIssues === 'true',
        hasWiki: req.query.hasWiki === 'true',
        hasPages: req.query.hasPages === 'true',
        archived: req.query.archived === 'true',
        fork: req.query.fork === 'true',
        sort: req.query.sort as 'stars' | 'forks' | 'updated' | 'created',
        order: req.query.order as 'asc' | 'desc',
        perPage: req.query.perPage ? parseInt(req.query.perPage as string) : 30,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
      };

      // Create cache key from filters
      const cacheKey = CacheKeys.search(JSON.stringify(filters));

      // Check for cached results first
      const cached = await cacheService.get(cacheKey, { prefix: 'search' });
      if (cached) {
        logger.info(`Returning cached search results for user ${userId}`);
        res.json({
          success: true,
          data: {
            repositories: cached.repositories,
            totalCount: cached.results.totalCount,
            page: cached.results.page,
            perPage: cached.results.perPage,
            searchId: cached._id,
            cached: true,
          },
        });
        return;
      }

      // Perform new search
      const result = await discoveryEngine.discoverRepositories(userId, filters);

      res.json({
        success: true,
        data: {
          repositories: result.repositories,
          totalCount: result.totalCount,
          page: filters.page || 1,
          perPage: filters.perPage || 30,
          searchId: result.searchId,
          cached: false,
        },
      });

    } catch (error) {
      logger.error('Repository search failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search repositories',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const discoveryController = new DiscoveryController();
