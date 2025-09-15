import { Response } from 'express';
import { logger } from '../config/logger';
import { dataCollectionPipeline } from '../services/dataCollectionPipeline';
import { githubApiService } from '../services/githubApi';

export class CollectionController {
  /**
   * Start a data collection job
   */
  async startCollectionJob(req: any, res: Response): Promise<void> {
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
  async getJobStatus(req: any, res: Response): Promise<void> {
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
  async cancelJob(req: any, res: Response): Promise<void> {
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
  async getUserJobs(req: any, res: Response): Promise<void> {
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
  async getRateLimit(req: any, res: Response): Promise<void> {
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
}

export const collectionController = new CollectionController();
