const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { summary, spendingTrends, categoryAnalysis, analytics, merchantAnalytics, subscriptions, recommendations } = require('../controllers/insightsController');

const router = express.Router();

router.use(requireAuth);

router.get('/summary', asyncHandler(summary));
router.get('/spending-trends', asyncHandler(spendingTrends));
router.get('/category-analysis', asyncHandler(categoryAnalysis));
router.get('/analytics', asyncHandler(analytics));
router.get('/merchant-analytics', asyncHandler(merchantAnalytics));
router.get('/subscriptions', asyncHandler(subscriptions));
router.get('/recommendations', asyncHandler(recommendations));

module.exports = router;
