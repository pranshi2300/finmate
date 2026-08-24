const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { monthEnd, category, budgetRisk, cashflow } = require('../controllers/predictionController');

const router = express.Router();
router.use(requireAuth);

router.get('/month-end', asyncHandler(monthEnd));
router.get('/category', asyncHandler(category));
router.get('/budget-risk', asyncHandler(budgetRisk));
router.get('/cashflow', asyncHandler(cashflow));

module.exports = router;
