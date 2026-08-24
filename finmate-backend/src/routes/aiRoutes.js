const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { chat } = require('../controllers/aiController');

const router = express.Router();
router.use(requireAuth);
router.post('/chat', asyncHandler(chat));

module.exports = router;
