const express = require('express');
const router = express.Router();
const { verifyToken, isSeller } = require('../middleware/auth');
const orderController = require('../controllers/orderController');

// Create order
router.post('/create', verifyToken, orderController.createOrder);

// Get all orders for a user
router.get('/user', verifyToken, orderController.getUserOrders);

// Get seller orders
router.get('/seller-orders', verifyToken, isSeller, orderController.getSellerOrders);

// Update order status (seller only)
router.put('/seller-orders/:orderId/status', verifyToken, isSeller, orderController.updateOrderStatus);

// Cancel order (seller only)
router.put('/seller-orders/:orderId/cancel', verifyToken, isSeller, orderController.cancelSellerOrder);

// Verify payment
router.post('/verify', verifyToken, orderController.verifyPayment);

// Add invoice generation route
router.get('/invoice/:orderId', verifyToken, orderController.generateInvoice);

module.exports = router; 