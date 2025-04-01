const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, isSeller } = require('../middleware/auth');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductRating,
  getSellerProducts,
  getProductCategories,
  getProductSubcategories,
  uploadProductImage
} = require('../controllers/productController');

// Public routes
router.get('/', getAllProducts);
router.get('/categories', getProductCategories);
router.get('/categories/:category/subcategories', getProductSubcategories);

// Protected routes
router.get('/seller/:sellerId?', verifyToken, getSellerProducts);
router.get('/:id', getProductById);
router.post('/', verifyToken, isSeller, uploadProductImage, createProduct);
router.put('/:id', verifyToken, uploadProductImage, updateProduct);
router.delete('/:id', verifyToken, deleteProduct);
router.post('/:id/rating', verifyToken, addProductRating);

module.exports = router; 