import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { createError } from './errorHandler';
import { logger } from '../config/logger';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined,
    }));

    logger.warn('Validation errors:', { errors: errorMessages, path: req.path });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorMessages,
    });
  }

  next();
};

/**
 * Common validation rules
 */
export const validationRules = {
  // User validation
  githubCode: body('code')
    .isString()
    .isLength({ min: 1, max: 100 })
    .trim()
    .escape()
    .withMessage('Valid GitHub authorization code is required'),

  githubState: body('state')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .trim()
    .escape()
    .withMessage('State must be a valid string'),

  // Repository validation
  repositoryOwner: param('owner')
    .isString()
    .isLength({ min: 1, max: 39 })
    .matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/)
    .withMessage('Owner must be a valid GitHub username'),

  repositoryName: param('repo')
    .isString()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('Repository name must be valid'),

  repositoryId: param('id')
    .isMongoId()
    .withMessage('Repository ID must be a valid MongoDB ObjectId'),

  // Search validation
  searchQuery: query('query')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .trim()
    .withMessage('Search query must be a string with max 200 characters'),

  language: query('language')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .matches(/^[a-zA-Z0-9+#-]+$/)
    .withMessage('Language must be a valid programming language name'),

  minStars: query('minStars')
    .optional()
    .isInt({ min: 0, max: 1000000 })
    .toInt()
    .withMessage('Minimum stars must be a positive integer'),

  maxStars: query('maxStars')
    .optional()
    .isInt({ min: 0, max: 1000000 })
    .toInt()
    .withMessage('Maximum stars must be a positive integer'),

  minForks: query('minForks')
    .optional()
    .isInt({ min: 0, max: 100000 })
    .toInt()
    .withMessage('Minimum forks must be a positive integer'),

  maxForks: query('maxForks')
    .optional()
    .isInt({ min: 0, max: 100000 })
    .toInt()
    .withMessage('Maximum forks must be a positive integer'),

  page: query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .toInt()
    .withMessage('Page must be a positive integer between 1 and 1000'),

  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Limit must be a positive integer between 1 and 100'),

  perPage: query('perPage')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Per page must be a positive integer between 1 and 100'),

  sort: query('sort')
    .optional()
    .isIn(['stars', 'forks', 'updated', 'created', 'score'])
    .withMessage('Sort must be one of: stars, forks, updated, created, score'),

  order: query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be either asc or desc'),

  // Date validation
  dateAfter: query('lastCommitAfter')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Last commit after must be a valid ISO 8601 date'),

  dateBefore: query('lastCommitBefore')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Last commit before must be a valid ISO 8601 date'),

  // Boolean validation
  hasIssues: query('hasIssues')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('Has issues must be a boolean'),

  hasWiki: query('hasWiki')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('Has wiki must be a boolean'),

  hasPages: query('hasPages')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('Has pages must be a boolean'),

  archived: query('archived')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('Archived must be a boolean'),

  fork: query('fork')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('Fork must be a boolean'),

  // Job validation
  jobName: body('name')
    .isString()
    .isLength({ min: 1, max: 100 })
    .trim()
    .escape()
    .withMessage('Job name is required and must be between 1-100 characters'),

  jobId: param('jobId')
    .isMongoId()
    .withMessage('Job ID must be a valid MongoDB ObjectId'),

  // Analysis validation
  minScore: query('minScore')
    .optional()
    .isInt({ min: 0, max: 100 })
    .toInt()
    .withMessage('Minimum score must be between 0 and 100'),
};

/**
 * Validation middleware factories
 */
export const validate = {
  // Authentication
  githubCallback: [
    validationRules.githubCode,
    validationRules.githubState,
    handleValidationErrors,
  ],

  // Repository operations
  getRepository: [
    validationRules.repositoryId,
    handleValidationErrors,
  ],

  getRepositoryByName: [
    validationRules.repositoryOwner,
    validationRules.repositoryName,
    handleValidationErrors,
  ],

  analyzeRepository: [
    validationRules.repositoryOwner,
    validationRules.repositoryName,
    handleValidationErrors,
  ],

  // Search operations
  searchRepositories: [
    validationRules.searchQuery,
    validationRules.language,
    validationRules.minStars,
    validationRules.maxStars,
    validationRules.minForks,
    validationRules.maxForks,
    validationRules.page,
    validationRules.perPage,
    validationRules.sort,
    validationRules.order,
    validationRules.dateAfter,
    validationRules.dateBefore,
    validationRules.hasIssues,
    validationRules.hasWiki,
    validationRules.hasPages,
    validationRules.archived,
    validationRules.fork,
    handleValidationErrors,
  ],

  getHighPotentialRepositories: [
    validationRules.page,
    validationRules.limit,
    validationRules.minScore,
    validationRules.language,
    handleValidationErrors,
  ],

  // Job operations
  startCollectionJob: [
    validationRules.jobName,
    handleValidationErrors,
  ],

  getJobStatus: [
    validationRules.jobId,
    handleValidationErrors,
  ],

  cancelJob: [
    validationRules.jobId,
    handleValidationErrors,
  ],

  getUserJobs: [
    validationRules.limit,
    handleValidationErrors,
  ],
};

/**
 * Custom validation for cross-field dependencies
 */
export const validateDateRange = (req: Request, res: Response, next: NextFunction) => {
  const { lastCommitAfter, lastCommitBefore } = req.query;

  if (lastCommitAfter && lastCommitBefore) {
    const after = new Date(lastCommitAfter as string);
    const before = new Date(lastCommitBefore as string);

    if (after >= before) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [{
          field: 'dateRange',
          message: 'lastCommitAfter must be before lastCommitBefore',
        }],
      });
    }
  }

  next();
};

export const validateStarRange = (req: Request, res: Response, next: NextFunction) => {
  const { minStars, maxStars } = req.query;

  if (minStars && maxStars) {
    const min = parseInt(minStars as string);
    const max = parseInt(maxStars as string);

    if (min > max) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [{
          field: 'starRange',
          message: 'minStars must be less than or equal to maxStars',
        }],
      });
    }
  }

  next();
};

export const validateForkRange = (req: Request, res: Response, next: NextFunction) => {
  const { minForks, maxForks } = req.query;

  if (minForks && maxForks) {
    const min = parseInt(minForks as string);
    const max = parseInt(maxForks as string);

    if (min > max) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [{
          field: 'forkRange',
          message: 'minForks must be less than or equal to maxForks',
        }],
      });
    }
  }

  next();
};
