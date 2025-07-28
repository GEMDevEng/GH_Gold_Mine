import { Router } from 'express';
import { repositoryController } from '../controllers/repositoryController';
import { authenticate } from '../middleware/auth';
import {
  rateLimiter,
  searchRateLimiter,
  userSearchRateLimiter,
  userJobRateLimiter
} from '../middleware/rateLimiter';

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
router.get('/search', searchRateLimiter, userSearchRateLimiter, repositoryController.searchRepositories.bind(repositoryController));

/**
 * @route   GET /api/repositories/high-potential
 * @desc    Get repositories with high revival potential
 * @access  Private
 * @params  page, limit, minScore, language
 */
router.get('/high-potential', repositoryController.getHighPotentialRepositories.bind(repositoryController));

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
router.get('/rate-limit', repositoryController.getRateLimit.bind(repositoryController));

/**
 * @route   GET /api/repositories/:id
 * @desc    Get repository details by ID
 * @access  Private
 */
router.get('/:id', repositoryController.getRepository.bind(repositoryController));

/**
 * @route   GET /api/repositories/github/:owner/:repo
 * @desc    Get repository by GitHub owner/repo name
 * @access  Private
 */
router.get('/github/:owner/:repo', repositoryController.getRepositoryByName.bind(repositoryController));

// Collection job routes
/**
 * @route   POST /api/repositories/jobs
 * @desc    Start a new data collection job
 * @access  Private
 * @body    { name, filters, settings }
 */
router.post('/jobs', userJobRateLimiter, repositoryController.startCollectionJob.bind(repositoryController));

/**
 * @route   GET /api/repositories/jobs
 * @desc    Get user's collection jobs
 * @access  Private
 * @params  limit
 */
router.get('/jobs', repositoryController.getUserJobs.bind(repositoryController));

/**
 * @route   GET /api/repositories/jobs/:jobId
 * @desc    Get collection job status
 * @access  Private
 */
router.get('/jobs/:jobId', repositoryController.getJobStatus.bind(repositoryController));

/**
 * @route   DELETE /api/repositories/jobs/:jobId
 * @desc    Cancel a collection job
 * @access  Private
 */
router.delete('/jobs/:jobId', repositoryController.cancelJob.bind(repositoryController));

export default router;
