import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { User } from '../models/User';
import { Repository } from '../models/Repository';
import { logger } from '../config/logger';

const router = Router();

// GET /api/users/profile
router.get('/profile', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('-githubAccessToken');

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  res.json({
    success: true,
    data: user,
  });
}));

// GET /api/users/saved-repositories
router.get('/saved-repositories', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  // Get saved repositories with full details
  const savedRepositories = await Repository.find({
    _id: { $in: user.savedRepositories }
  }).sort({ 'revival.potentialScore': -1 });

  res.json({
    success: true,
    data: savedRepositories,
  });
}));

// POST /api/users/saved-repositories/:repositoryId
router.post('/saved-repositories/:repositoryId', authenticate, asyncHandler(async (req, res) => {
  const { repositoryId } = req.params;
  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  // Check if repository exists
  const repository = await Repository.findById(repositoryId);
  if (!repository) {
    return res.status(404).json({
      success: false,
      error: 'Repository not found',
    });
  }

  // Add to saved repositories if not already saved
  if (!user.savedRepositories.includes(repositoryId)) {
    user.savedRepositories.push(repositoryId);
    await user.save();
  }

  res.json({
    success: true,
    data: {
      message: 'Repository saved successfully',
    },
  });
}));

// DELETE /api/users/saved-repositories/:repositoryId
router.delete('/saved-repositories/:repositoryId', authenticate, asyncHandler(async (req, res) => {
  const { repositoryId } = req.params;
  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  // Remove from saved repositories
  user.savedRepositories = user.savedRepositories.filter(id => id !== repositoryId);
  await user.save();

  res.json({
    success: true,
    data: {
      message: 'Repository removed successfully',
    },
  });
}));

// GET /api/users/analysis-history
router.get('/analysis-history', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  // Return analysis history sorted by date (most recent first)
  const analysisHistory = user.analysisHistory
    .sort((a, b) => new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime())
    .slice(0, 50); // Limit to last 50 entries

  res.json({
    success: true,
    data: analysisHistory,
  });
}));

// GET /api/users/recommendations
router.get('/recommendations', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  // Get user's analysis history to understand preferences
  const analyzedLanguages = new Set<string>();
  const highScoredRepos = new Set<string>();

  user.analysisHistory.forEach(entry => {
    if (entry.revivalScore >= 70) {
      highScoredRepos.add(entry.repositoryId);
    }
  });

  // Get languages from saved repositories
  if (user.savedRepositories.length > 0) {
    const savedRepos = await Repository.find({
      _id: { $in: user.savedRepositories }
    });

    savedRepos.forEach(repo => {
      const primaryLanguage = Object.keys(repo.metrics.languages)[0];
      if (primaryLanguage) {
        analyzedLanguages.add(primaryLanguage);
      }
    });
  }

  // Build recommendation query
  const query: any = {
    _id: { $nin: [...user.savedRepositories, ...Array.from(highScoredRepos)] },
    'revival.potentialScore': { $gte: 70 },
    'revival.recommendation': { $in: ['high', 'medium'] }
  };

  // If user has language preferences, include them
  if (analyzedLanguages.size > 0) {
    const languageArray = Array.from(analyzedLanguages);
    query.$or = languageArray.map(lang => ({
      [`metrics.languages.${lang}`]: { $exists: true }
    }));
  }

  // Get recommendations
  const recommendations = await Repository.find(query)
    .sort({ 'revival.potentialScore': -1 })
    .limit(12);

  res.json({
    success: true,
    data: recommendations,
  });
}));

export default router;
