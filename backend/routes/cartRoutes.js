const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { verifyToken, optionalAuth } = require('../middleware/auth');

// Apply optional authentication middleware to all cart routes
// This will populate req.user if a valid token is provided, but won't return an error if not
router.use(optionalAuth);

// Get cart count
router.get('/count', cartController.getCartCount);

// Get user's cart
router.get('/', cartController.getCart);

// Add product to cart
router.post('/add', cartController.addToCart);

// Update cart item quantity
router.put('/update', cartController.updateCartItem);

// Remove item from cart
router.delete('/:productId', cartController.removeFromCart);

// Clear cart
router.delete('/', cartController.clearCart);

// Routes that must be authenticated
router.post('/sync', verifyToken, cartController.syncGuestCart);
router.get('/checkout-allowed', verifyToken, (req, res) => {
  res.json({ success: true, allowed: true });
});

module.exports = router; 