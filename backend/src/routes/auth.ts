import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate, optionalAuth } from '../middleware/auth';
import { authService } from '../services/authService';
import { User } from '../models/User';
import { logger } from '../config/logger';

const router = Router();

// GET /api/auth/github/url - Get GitHub OAuth URL
router.get('/github/url', asyncHandler(async (req, res) => {
  try {
    const state = req.query.state as string;
    const authUrl = authService.generateGitHubAuthUrl(state);

    res.json({
      success: true,
      data: {
        url: authUrl,
        state,
      },
    });
  } catch (error) {
    logger.error('Failed to generate GitHub auth URL:', error);
    throw createError('Failed to initiate authentication', 500);
  }
}));

// POST /api/auth/github/callback - Handle GitHub OAuth callback
router.post('/github/callback', asyncHandler(async (req, res) => {
  const { code, state } = req.body;

  if (!code) {
    throw createError('Authorization code is required', 400);
  }

  try {
    // Complete GitHub OAuth flow
    const authResult = await authService.completeGitHubAuth(code);

    // Set secure HTTP-only cookies for tokens
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };

    res.cookie('accessToken', authResult.tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', authResult.tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      message: 'Authentication successful',
      data: {
        user: authResult.user,
        isNewUser: authResult.isNewUser,
        expiresIn: authResult.tokens.expiresIn,
      },
    });
  } catch (error) {
    logger.error('GitHub OAuth callback failed:', error);
    throw createError(error instanceof Error ? error.message : 'Authentication failed', 401);
  }
}));

// GET /api/auth/me - Get current user
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createError('User not found', 404);
  }

  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
}));

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    throw createError('Refresh token is required', 401);
  }

  try {
    const tokens = await authService.refreshAccessToken(refreshToken);

    // Set new cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };

    res.cookie('accessToken', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: {
        expiresIn: tokens.expiresIn,
      },
    });
  } catch (error) {
    logger.error('Token refresh failed:', error);
    throw createError(error instanceof Error ? error.message : 'Token refresh failed', 401);
  }
}));

// POST /api/auth/logout - Logout user
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // For JWT tokens, logout is handled client-side by removing the token
  // In the future, we could implement a token blacklist

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}));

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticate, asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createError('User not found', 404);
  }

  const { preferences } = req.body;

  if (preferences) {
    req.user.preferences = { ...req.user.preferences, ...preferences };
    await req.user.save();
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: req.user,
    },
  });
}));

// POST /api/auth/refresh-github - Refresh GitHub user data
router.post('/refresh-github', authenticate, asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createError('User not found', 404);
  }

  try {
    const updatedUser = await refreshGitHubUserData(req.user);

    res.json({
      success: true,
      message: 'GitHub data refreshed successfully',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    logger.error('GitHub data refresh failed:', error);
    throw createError('Failed to refresh GitHub data', 500);
  }
}));

// POST /api/auth/logout - Logout user
router.post('/logout', asyncHandler(async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout failed:', error);
    // Still return success for logout even if token invalidation fails
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}));

// DELETE /api/auth/account - Delete user account
router.delete('/account', authenticate, asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createError('User not found', 404);
  }

  // Soft delete - mark as inactive
  req.user.isActive = false;
  await req.user.save();

  res.json({
    success: true,
    message: 'Account deleted successfully',
  });
}));

export default router;
