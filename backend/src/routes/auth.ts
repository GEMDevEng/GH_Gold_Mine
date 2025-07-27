import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate, optionalAuth } from '../middleware/auth';
import { completeGitHubAuth, refreshGitHubUserData } from '../services/githubAuth';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { User } from '../models/User';
import { logger } from '../config/logger';

const router = Router();

// GET /api/auth/github/url - Get GitHub OAuth URL
router.get('/github/url', asyncHandler(async (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:5173/auth/callback';

  if (!clientId) {
    throw createError('GitHub OAuth not configured', 500);
  }

  const scope = 'user:email,read:user';
  const state = Math.random().toString(36).substring(2, 15);

  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;

  res.json({
    success: true,
    data: {
      url: githubUrl,
      state,
    },
  });
}));

// POST /api/auth/github/callback - Handle GitHub OAuth callback
router.post('/github/callback', asyncHandler(async (req, res) => {
  const { code, state } = req.body;

  if (!code) {
    throw createError('Authorization code is required', 400);
  }

  try {
    const result = await completeGitHubAuth(code);

    res.json({
      success: true,
      message: 'Authentication successful',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  } catch (error) {
    logger.error('GitHub OAuth callback failed:', error);
    throw createError('Authentication failed', 401);
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
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw createError('Refresh token is required', 400);
  }

  try {
    const { userId } = verifyRefreshToken(refreshToken);
    const user = await User.findById(userId);

    if (!user || !user.isActive) {
      throw createError('User not found or inactive', 401);
    }

    const tokens = generateTokens(user);

    res.json({
      success: true,
      data: {
        tokens,
      },
    });
  } catch (error) {
    logger.error('Token refresh failed:', error);
    throw createError('Invalid refresh token', 401);
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
