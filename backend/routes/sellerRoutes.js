const express = require('express');
const router = express.Router();
const { verifyToken, isSeller } = require('../middleware/auth');
const { getSellerAnalytics } = require('../controllers/sellerController');

// Seller analytics endpoint
router.get('/analytics', verifyToken, isSeller, getSellerAnalytics);

module.exports = router; 