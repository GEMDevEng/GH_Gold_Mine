
import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { analysisEngine } from '../services/analysisEngine';
import { Repository } from '../models/Repository';
import { createError } from '../middleware/errorHandler';

/**
 * Analyze a specific repository
 */
export const analyzeRepository = async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.params;
    
    if (!owner || !repo) {
      throw createError('Owner and repository name are required', 400);
    }

    logger.info(`Starting analysis for ${owner}/${repo}`);

    // Check if analysis already exists and is recent (less than 24 hours old)
    const existingRepo = await Repository.findOne({ 
      fullName: `${owner}/${repo}` 
    });

    if (existingRepo && existingRepo.analysis && existingRepo.analysis.analyzedAt) {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (existingRepo.analysis.analyzedAt > dayAgo) {
        logger.info(`Returning cached analysis for ${owner}/${repo}`);
        return res.json({
          success: true,
          data: existingRepo.analysis,
          cached: true
        });
      }
    }

    // Perform new analysis
    const analysis = await analysisEngine.analyzeRepository(owner, repo);

    // Update repository record with analysis
    if (existingRepo) {
      existingRepo.analysis = analysis;
      existingRepo.lastAnalyzedAt = new Date();
      await existingRepo.save();
    } else {
      // Create basic repository record if it doesn't exist
      const newRepo = new Repository({
        githubId: 0, // Will be updated when we get full repo data
        fullName: `${owner}/${repo}`,
        name: repo,
        owner: {
          login: owner,
          type: 'User',
          avatar: '',
          url: ''
        },
        analysis,
        lastAnalyzedAt: new Date(),
        lastSyncAt: new Date()
      });
      await newRepo.save();
    }

    res.json({
      success: true,
      data: analysis,
      cached: false
    });

  } catch (error) {
    logger.error('Analysis failed:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Analysis failed',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
};

/**
 * Get analysis for a repository
 */
export const getRepositoryAnalysis = async (req: Request, res: Response) => {
  try {
    const { owner, repo } = req.params;
    
    if (!owner || !repo) {
      throw createError('Owner and repository name are required', 400);
    }

    const repository = await Repository.findOne({ 
      fullName: `${owner}/${repo}` 
    });

    if (!repository || !repository.analysis) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Analysis not found. Please run analysis first.'
        }
      });
    }

    res.json({
      success: true,
      data: repository.analysis
    });

  } catch (error) {
    logger.error('Failed to get analysis:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get analysis',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
};

/**
 * Batch analyze multiple repositories
 */
export const batchAnalyzeRepositories = async (req: Request, res: Response) => {
  try {
    const { repositories } = req.body;
    
    if (!repositories || !Array.isArray(repositories)) {
      throw createError('Repositories array is required', 400);
    }

    if (repositories.length > 10) {
      throw createError('Maximum 10 repositories allowed per batch', 400);
    }

    const results = [];
    const errors = [];

    for (const repoInfo of repositories) {
      try {
        const { owner, repo } = repoInfo;
        if (!owner || !repo) {
          errors.push({ repository: repoInfo, error: 'Owner and repo name required' });
          continue;
        }

        const analysis = await analysisEngine.analyzeRepository(owner, repo);
        results.push({
          repository: `${owner}/${repo}`,
          analysis,
          success: true
        });

      } catch (error) {
        errors.push({
          repository: repoInfo,
          error: error.message,
          success: false
        });
      }
    }

    res.json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          total: repositories.length,
          successful: results.length,
          failed: errors.length
        }
      }
    });

  } catch (error) {
    logger.error('Batch analysis failed:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Batch analysis failed',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
};

/**
 * Get analysis statistics
 */
export const getAnalysisStats = async (req: Request, res: Response) => {
  try {
    const stats = await Repository.aggregate([
      {
        $match: {
          analysis: { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          totalAnalyzed: { $sum: 1 },
          averageRevivalScore: { $avg: '$analysis.revivalPotential.score' },
          highPotential: {
            $sum: {
              $cond: [
                { $gte: ['$analysis.revivalPotential.score', 70] },
                1,
                0
              ]
            }
          },
          mediumPotential: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$analysis.revivalPotential.score', 40] },
                    { $lt: ['$analysis.revivalPotential.score', 70] }
                  ]
                },
                1,
                0
              ]
            }
          },
          lowPotential: {
            $sum: {
              $cond: [
                { $lt: ['$analysis.revivalPotential.score', 40] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalAnalyzed: 0,
      averageRevivalScore: 0,
      highPotential: 0,
      mediumPotential: 0,
      lowPotential: 0
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to get analysis stats:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get analysis stats',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
};
