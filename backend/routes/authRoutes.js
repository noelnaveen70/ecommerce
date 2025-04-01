const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  changePassword,
  googleLogin,
  sellerRegister,
  getSellerProfile,
  updateSellerProfile,
  getAllUsers, 
  getPendingSellers, 
  approveSeller, 
  rejectSeller, 
  suspendUser, 
  restoreUser,
  requestPasswordReset,
  verifyOTP,
  resetPassword
} = require('../controllers/authController');
const { verifyToken, isSeller, isAdmin } = require('../middleware/auth');
const { 
  getAddresses, 
  addOrUpdateAddress, 
  deleteAddress, 
  setDefaultAddress 
} = require('../controllers/addressController');
const User = require('../model/userModel');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/seller-register', sellerRegister);

// Password reset routes
router.post('/request-password-reset', requestPasswordReset);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/change-password', verifyToken, changePassword);

// Seller routes
router.get('/seller-profile', verifyToken, isSeller, getSellerProfile);
router.put('/seller-profile', verifyToken, isSeller, updateSellerProfile);

// Address routes
router.get('/addresses', verifyToken, getAddresses);
router.post('/address', verifyToken, addOrUpdateAddress);
router.delete('/address/:id', verifyToken, deleteAddress);
router.put('/address/:id/default', verifyToken, setDefaultAddress);

// Admin routes
router.get('/users', verifyToken, isAdmin, getAllUsers);
router.get('/users/sellers/pending', verifyToken, isAdmin, getPendingSellers);
router.put('/users/:id/approve', verifyToken, isAdmin, approveSeller);
router.put('/users/:id/reject', verifyToken, isAdmin, rejectSeller);
router.put('/users/:id/suspend', verifyToken, isAdmin, suspendUser);
router.put('/users/:id/restore', verifyToken, isAdmin, restoreUser);

// Add new route for updating phone number (admin only)
router.put('/users/:id/update-phone', verifyToken, isAdmin, async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit phone number'
      });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    user.phone = phone;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Phone number updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating phone number:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating phone number',
      error: error.message
    });
  }
});

module.exports = router;