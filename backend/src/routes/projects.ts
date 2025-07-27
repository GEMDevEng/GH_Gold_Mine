import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/projects
router.get('/', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Get projects endpoint - coming soon',
    data: {
      projects: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      },
    },
  });
}));

// GET /api/projects/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    message: `Get project ${id} endpoint - coming soon`,
    data: null,
  });
}));

// POST /api/projects/search
router.post('/search', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Search projects endpoint - coming soon',
    data: {
      projects: [],
      filters: req.body,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      },
    },
  });
}));

// POST /api/projects/:id/favorite
router.post('/:id/favorite', asyncHandler(async (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    message: `Favorite project ${id} endpoint - coming soon`,
    data: null,
  });
}));

// DELETE /api/projects/:id/favorite
router.delete('/:id/favorite', asyncHandler(async (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    message: `Unfavorite project ${id} endpoint - coming soon`,
    data: null,
  });
}));

export default router;
