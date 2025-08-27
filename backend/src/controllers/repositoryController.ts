import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { discoveryEngine } from '../services/discoveryEngine';
import { dataCollectionPipeline } from '../services/dataCollectionPipeline';
import { githubApiService } from '../services/githubApi';
import { cacheService, CacheKeys, CacheTTL } from '../services/cacheService';
import { performanceService } from '../services/performanceService';
import { Repository } from '../models/Repository';
import { SearchResult } from '../models/SearchResult';
import { DiscoveryJob } from '../models/ApiUsage';
import { RepositorySearchFilters } from '../types/github';

export class RepositoryController {
  /**
   * Search repositories with filters
   */
  async searchRepositories(req: Request, res: Response): Promise<void> {
    const timer = performanceService.startTimer('searchRepositories');

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
        timer();
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

  /**
   * Get repository details by ID
   */
  async getRepository(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const repository = await Repository.findById(id);
      if (!repository) {
        res.status(404).json({
          success: false,
          error: 'Repository not found',
        });
        return;
      }

      res.json({
        success: true,
        data: repository,
      });

    } catch (error) {
      logger.error('Failed to get repository:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve repository',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get repository by GitHub full name (owner/repo)
   */
  async getRepositoryByName(req: Request, res: Response): Promise<void> {
    try {
      const { owner, repo } = req.params;
      const fullName = `${owner}/${repo}`;
      
      let repository = await Repository.findOne({ fullName });
      
      if (!repository) {
        // Try to fetch from GitHub API and create record
        try {
          const githubRepo = await githubApiService.getRepository(owner, repo);
          // This would trigger the discovery engine to create a full record
          // For now, return basic info
          res.json({
            success: true,
            data: {
              message: 'Repository found on GitHub but not in our database',
              githubData: githubRepo,
            },
          });
          return;
        } catch (githubError) {
          res.status(404).json({
            success: false,
            error: 'Repository not found',
          });
          return;
        }
      }

      res.json({
        success: true,
        data: repository,
      });

    } catch (error) {
      logger.error('Failed to get repository by name:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve repository',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get repositories with high revival potential
   */
  async getHighPotentialRepositories(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const minScore = parseInt(req.query.minScore as string) || 70;
      const language = req.query.language as string;
      
      const skip = (page - 1) * limit;
      
      const filter: any = {
        'revival.potentialScore': { $gte: minScore },
        'revival.recommendation': { $in: ['high', 'medium'] },
      };

      if (language) {
        filter['metrics.topics'] = language;
      }

      const [repositories, total] = await Promise.all([
        Repository.find(filter)
          .sort({ 'revival.potentialScore': -1, 'metrics.stars': -1 })
          .skip(skip)
          .limit(limit),
        Repository.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          repositories,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });

    } catch (error) {
      logger.error('Failed to get high potential repositories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve repositories',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Start a data collection job
   */
  async startCollectionJob(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { name, filters, settings } = req.body;

      if (!name || !filters) {
        res.status(400).json({
          success: false,
          error: 'Name and filters are required',
        });
        return;
      }

      const jobId = await dataCollectionPipeline.startCollectionJob(
        userId,
        name,
        filters,
        settings
      );

      res.json({
        success: true,
        data: {
          jobId,
          message: 'Collection job started successfully',
        },
      });

    } catch (error) {
      logger.error('Failed to start collection job:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start collection job',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get collection job status
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const userId = req.user?.id;

      const job = await dataCollectionPipeline.getJobStatus(jobId);
      
      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      // Check if user owns this job
      if (job.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      res.json({
        success: true,
        data: job,
      });

    } catch (error) {
      logger.error('Failed to get job status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve job status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Cancel a collection job
   */
  async cancelJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const cancelled = await dataCollectionPipeline.cancelJob(jobId, userId);
      
      if (!cancelled) {
        res.status(400).json({
          success: false,
          error: 'Job cannot be cancelled or not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          message: 'Job cancelled successfully',
        },
      });

    } catch (error) {
      logger.error('Failed to cancel job:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel job',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get user's collection jobs
   */
  async getUserJobs(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const jobs = await dataCollectionPipeline.getUserJobs(userId, limit);

      res.json({
        success: true,
        data: jobs,
      });

    } catch (error) {
      logger.error('Failed to get user jobs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get GitHub API rate limit status
   */
  async getRateLimit(req: Request, res: Response): Promise<void> {
    try {
      const rateLimitInfo = await githubApiService.getRateLimit();

      res.json({
        success: true,
        data: rateLimitInfo,
      });

    } catch (error) {
      logger.error('Failed to get rate limit:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve rate limit information',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get repository statistics
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const [
        totalRepositories,
        highPotential,
        mediumPotential,
        lowPotential,
        languageStats,
        recentlyAnalyzed,
      ] = await Promise.all([
        Repository.countDocuments(),
        Repository.countDocuments({ 'revival.recommendation': 'high' }),
        Repository.countDocuments({ 'revival.recommendation': 'medium' }),
        Repository.countDocuments({ 'revival.recommendation': 'low' }),
        Repository.aggregate([
          { $unwind: '$metrics.topics' },
          { $group: { _id: '$metrics.topics', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        Repository.countDocuments({
          analyzedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalRepositories,
          revivalPotential: {
            high: highPotential,
            medium: mediumPotential,
            low: lowPotential,
            notRecommended: totalRepositories - highPotential - mediumPotential - lowPotential,
          },
          topLanguages: languageStats,
          recentlyAnalyzed,
        },
      });

    } catch (error) {
      logger.error('Failed to get statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const repositoryController = new RepositoryController();
