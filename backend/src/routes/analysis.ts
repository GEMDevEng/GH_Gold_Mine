import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// POST /api/analysis/trigger
router.post('/trigger', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Trigger analysis endpoint - coming soon',
    data: {
      analysisId: 'temp-analysis-id',
      status: 'queued',
      estimatedTime: '5 minutes',
    },
  });
}));

// GET /api/analysis/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    message: `Get analysis ${id} endpoint - coming soon`,
    data: {
      analysisId: id,
      status: 'completed',
      results: null,
    },
  });
}));

// GET /api/analysis/:id/report
router.get('/:id/report', asyncHandler(async (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    message: `Get analysis report ${id} endpoint - coming soon`,
    data: {
      reportId: id,
      format: 'json',
      downloadUrl: null,
    },
  });
}));

export default router;
