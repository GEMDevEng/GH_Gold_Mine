import { Response } from 'express';
import { logger } from '../config/logger';
import { Repository } from '../models/Repository';

export class RepositoryController {
  /**
   * Get repository details by ID
   */
  async getRepository(req: any, res: Response): Promise<void> {
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
  async getRepositoryByName(req: any, res: Response): Promise<void> {
    try {
      const { owner, repo } = req.params;
      const fullName = `${owner}/${repo}`;

      let repository = await Repository.findOne({ fullName });

      if (!repository) {
        // Try to fetch from GitHub API and create record
        try {
          // This would trigger the discovery engine to create a full record
          // For now, return basic info
          res.json({
            success: true,
            data: {
              message: 'Repository found on GitHub but not in our database',
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
  async getHighPotentialRepositories(req: any, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const minScore = parseInt(req.query.minScore as string) || 70;

      const skip = (page - 1) * limit;

      const filter: any = {
        'revival.potentialScore': { $gte: minScore },
        'revival.recommendation': { $in: ['high', 'medium'] },
      };

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
   * Get repository statistics
   */
  async getStatistics(req: any, res: Response): Promise<void> {
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
