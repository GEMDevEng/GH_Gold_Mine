import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  rateLimiter,
  searchRateLimiter,
  userJobRateLimiter
} from '../middleware/rateLimiter';
import { validate } from '../middleware/validation';
import {
  analyzeRepository,
  getRepositoryAnalysis,
  batchAnalyzeRepositories,
  getAnalysisStats
} from '../controllers/analysisController';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Apply general rate limiting
router.use(rateLimiter);

/**
 * @route POST /api/analysis/:owner/:repo
 * @desc Analyze a specific repository
 * @access Private
 */
router.post(
  '/:owner/:repo',
  validate.analyzeRepository,
  userJobRateLimiter, // Analysis is expensive, use job rate limiting
  analyzeRepository
);

/**
 * @route GET /api/analysis/:owner/:repo
 * @desc Get existing analysis for a repository
 * @access Private
 */
router.get(
  '/:owner/:repo',
  validate.analyzeRepository,
  getRepositoryAnalysis
);

/**
 * @route POST /api/analysis/batch
 * @desc Batch analyze multiple repositories
 * @access Private
 */
router.post(
  '/batch',
  userJobRateLimiter, // Batch operations are expensive
  batchAnalyzeRepositories
);

/**
 * @route GET /api/analysis/stats
 * @desc Get analysis statistics
 * @access Private
 */
router.get(
  '/stats',
  getAnalysisStats
);

export default router;
