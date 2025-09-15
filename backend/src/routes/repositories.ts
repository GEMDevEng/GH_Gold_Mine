import { Router } from 'express';
import { repositoryController, discoveryController, collectionController } from '../controllers';
import { authenticate } from '../middleware/auth';
import {
  rateLimiter,
  searchRateLimiter,
  userSearchRateLimiter,
  userJobRateLimiter
} from '../middleware/rateLimiter';
import {
  validate,
  validateDateRange,
  validateStarRange,
  validateForkRange
} from '../middleware/validation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Apply rate limiting
router.use(rateLimiter);

/**
 * @route   GET /api/repositories/search
 * @desc    Search repositories with filters
 * @access  Private
 * @params  query, language, minStars, maxStars, minForks, maxForks,
 *          lastCommitBefore, lastCommitAfter, hasIssues, hasWiki, hasPages,
 *          archived, fork, sort, order, perPage, page
 */
router.get('/search', searchRateLimiter, userSearchRateLimiter, validate.searchRepositories, validateDateRange, validateStarRange, validateForkRange, discoveryController.searchRepositories.bind(discoveryController));

/**
 * @route   GET /api/repositories/high-potential
 * @desc    Get repositories with high revival potential
 * @access  Private
 * @params  page, limit, minScore, language
 */
router.get('/high-potential', validate.getHighPotentialRepositories, repositoryController.getHighPotentialRepositories.bind(repositoryController));

/**
 * @route   GET /api/repositories/statistics
 * @desc    Get repository statistics and analytics
 * @access  Private
 */
router.get('/statistics', repositoryController.getStatistics.bind(repositoryController));

/**
 * @route   GET /api/repositories/rate-limit
 * @desc    Get GitHub API rate limit status
 * @access  Private
 */
router.get('/rate-limit', collectionController.getRateLimit.bind(collectionController));

/**
 * @route   GET /api/repositories/:id
 * @desc    Get repository details by ID
 * @access  Private
 */
router.get('/:id', validate.getRepository, repositoryController.getRepository.bind(repositoryController));

/**
 * @route   GET /api/repositories/github/:owner/:repo
 * @desc    Get repository by GitHub owner/repo name
 * @access  Private
 */
router.get('/github/:owner/:repo', validate.getRepositoryByName, repositoryController.getRepositoryByName.bind(repositoryController));

// Collection job routes
/**
 * @route   POST /api/repositories/jobs
 * @desc    Start a new data collection job
 * @access  Private
 * @body    { name, filters, settings }
 */
router.post('/jobs', userJobRateLimiter, collectionController.startCollectionJob.bind(collectionController));

/**
 * @route   GET /api/repositories/jobs
 * @desc    Get user's collection jobs
 * @access  Private
 * @params  limit
 */
router.get('/jobs', collectionController.getUserJobs.bind(collectionController));

/**
 * @route   GET /api/repositories/jobs/:jobId
 * @desc    Get collection job status
 * @access  Private
 */
router.get('/jobs/:jobId', collectionController.getJobStatus.bind(collectionController));

/**
 * @route   DELETE /api/repositories/jobs/:jobId
 * @desc    Cancel a collection job
 * @access  Private
 */
router.delete('/jobs/:jobId', collectionController.cancelJob.bind(collectionController));

export default router;
