import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// POST /api/auth/register
router.post('/register', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'User registration endpoint - coming soon',
    data: null,
  });
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'User login endpoint - coming soon',
    data: null,
  });
}));

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'User logout endpoint - coming soon',
    data: null,
  });
}));

// GET /api/auth/me
router.get('/me', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Get current user endpoint - coming soon',
    data: null,
  });
}));

// POST /api/auth/github
router.post('/github', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'GitHub OAuth endpoint - coming soon',
    data: null,
  });
}));

export default router;
