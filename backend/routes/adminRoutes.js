const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const { getPlatformAnalytics } = require('../controllers/adminController');

// Platform analytics endpoint (Admin only)
router.get('/analytics', verifyToken, isAdmin, getPlatformAnalytics);

module.exports = router; 