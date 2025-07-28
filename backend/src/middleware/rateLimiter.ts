import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../config/logger';

// General API rate limiter
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    });
  },
});

// Strict rate limiter for expensive operations (like starting collection jobs)
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 requests per hour
  message: {
    success: false,
    error: 'Too many expensive operations from this IP, please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Strict rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'Too many expensive operations from this IP, please try again later.',
      retryAfter: '1 hour',
    });
  },
});

// Search-specific rate limiter
export const searchRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // limit each IP to 30 search requests per 5 minutes
  message: {
    success: false,
    error: 'Too many search requests, please try again later.',
    retryAfter: '5 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Search rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many search requests, please try again later.',
      retryAfter: '5 minutes',
    });
  },
});

// User-specific rate limiter (requires authentication)
export const createUserRateLimiter = (windowMs: number, max: number, message: string) => {
  const store = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: Function) => {
    const userId = req.user?.id;
    if (!userId) {
      return next(); // Skip if not authenticated
    }

    const now = Date.now();
    const userKey = `user:${userId}`;
    const userLimit = store.get(userKey);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize counter
      store.set(userKey, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (userLimit.count >= max) {
      logger.warn(`User rate limit exceeded for user: ${userId}, Path: ${req.path}`);
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
      });
    }

    userLimit.count++;
    store.set(userKey, userLimit);
    next();
  };
};

// User-specific rate limiters
export const userSearchRateLimiter = createUserRateLimiter(
  5 * 60 * 1000, // 5 minutes
  50, // 50 requests per user per 5 minutes
  'Too many search requests for your account, please try again later.'
);

export const userJobRateLimiter = createUserRateLimiter(
  60 * 60 * 1000, // 1 hour
  5, // 5 collection jobs per user per hour
  'Too many collection jobs started, please wait before starting another.'
);
