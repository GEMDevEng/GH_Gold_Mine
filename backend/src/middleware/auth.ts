import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User';
import { authService } from '../services/authService';
import { createError } from './errorHandler';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
    }
  }
}

/**
 * Middleware to authenticate user using JWT token
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Development mode bypass
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
      // Create a mock user for development
      req.user = {
        _id: 'dev-user-id',
        githubId: 'dev-github-id',
        username: 'dev-user',
        email: 'dev@example.com',
        name: 'Development User',
        avatar: 'https://avatars.githubusercontent.com/u/1?v=4',
        isActive: true,
        subscription: {
          plan: 'pro',
          status: 'active',
        },
        usage: {
          apiCalls: 0,
          analysesRun: 0,
          projectsDiscovered: 0,
          lastResetAt: new Date().toISOString(),
        },
        preferences: {
          emailNotifications: true,
          analysisAlerts: true,
          weeklyDigest: false,
          theme: 'light',
        },
      } as any;
      req.userId = 'dev-user-id';
      return next();
    }

    // Extract token from Authorization header or cookies
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies?.accessToken;

    if (!token) {
      return next(createError('Access token required', 401));
    }

    // Verify token using authService
    let tokenData: { userId: string };
    try {
      tokenData = await authService.verifyAccessToken(token);
    } catch (error) {
      return next(createError(error instanceof Error ? error.message : 'Invalid token', 401));
    }

    // Find user in database
    const user = await User.findById(tokenData.userId).select('-githubAccessToken');
    if (!user || !user.isActive) {
      return next(createError('User not found or inactive', 401));
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    next(createError('Authentication failed', 401));
  }
};

// Alias for backward compatibility
export const authenticate = authenticateToken;

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header or cookies
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies?.accessToken;

    if (token) {
      try {
        const tokenData = await authService.verifyAccessToken(token);
        const user = await User.findById(tokenData.userId).select('-githubAccessToken');

        if (user && user.isActive) {
          req.user = user;
          req.userId = user._id;
        }
      } catch (error) {
        // Ignore token errors in optional auth
      }
    }

    next();
  } catch (error) {
    // Ignore all errors in optional auth
    next();
  }
};

/**
 * Middleware to check if user has specific subscription plan
 */
export const requireSubscription = (plans: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    if (!plans.includes(req.user.subscription.plan)) {
      return next(createError(`This feature requires ${plans.join(' or ')} subscription`, 403));
    }

    if (req.user.subscription.status !== 'active') {
      return next(createError('Subscription is not active', 403));
    }

    next();
  };
};

/**
 * Middleware to check usage limits
 */
export const checkUsageLimit = (type: 'apiCalls' | 'analysesRun' | 'projectsDiscovered', limit: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    const usage = req.user.usage[type];
    if (usage >= limit) {
      return next(createError(`${type} limit exceeded. Upgrade your plan for higher limits.`, 429));
    }

    next();
  };
};

/**
 * Middleware to increment usage counter
 */
export const incrementUsage = (type: 'apiCalls' | 'analysesRun' | 'projectsDiscovered') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
      try {
        await req.user.incrementUsage(type);
      } catch (error) {
        // Don't fail the request if usage increment fails
        console.error('Failed to increment usage:', error);
      }
    }
    next();
  };
};

/**
 * Middleware to validate admin access (for future use)
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(createError('Authentication required', 401));
  }

  // For now, we don't have admin roles, but this is here for future expansion
  // if (req.user.role !== 'admin') {
  //   return next(createError('Admin access required', 403));
  // }

  next();
};
