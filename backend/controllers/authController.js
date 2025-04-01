const User = require('../model/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const Product = require('../model/productModel');
const Order = require('../model/orderModel');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Add new schema for OTP
const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // OTP expires after 10 minutes
  }
});

const OTP = mongoose.model('OTP', otpSchema);

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify transporter configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Function to generate a random OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register a new user
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Basic validations
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Create new user with password
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user',
      status: 'Active' // Regular users are active upon registration
    });
    
    // Generate token
    const token = user.generateAuthToken();
    
    // Remove password from response
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      status: user.status
    };
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const messages = {};
      
      // Extract specific validation error messages
      for (const field in error.errors) {
        messages[field] = error.errors[field].message;
      }
      
      // Return the specific validation error messages
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

// Register a new seller
exports.sellerRegister = async (req, res) => {
  try {
    console.log('Seller Register API called with data:', JSON.stringify(req.body, null, 2));
    
    const { name, email, password, phone, sellerInfo } = req.body;
    
    // Basic validations
    if (!name || !email || !password) {
      console.log('Registration failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }
    
    if (password.length < 6) {
      console.log('Registration failed: Password too short');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    
    if (!sellerInfo || !sellerInfo.businessName || !sellerInfo.location) {
      console.log('Registration failed: Missing business info', sellerInfo);
      return res.status(400).json({
        success: false,
        message: 'Business name and location are required'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Registration failed: Email already in use', email);
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    console.log('Creating seller with data:', {
      name,
      email,
      phone,
      businessDetails: sellerInfo
    });
    
    // Create new seller user
    const seller = await User.create({
      name,
      email,
      password,
      phone,
      role: 'seller',
      status: 'Pending', // Sellers are pending until approved
      sellerInfo: {
        businessName: sellerInfo.businessName,
        location: sellerInfo.location,
        description: sellerInfo.description || '',
        joinedAsSeller: new Date(),
        isApproved: false,
        sellerRating: 0,
        totalSales: 0
      }
    });
    
    console.log('Seller created successfully with ID:', seller._id);
    
    // Generate token
    const token = seller.generateAuthToken();
    
    // Remove password from response
    const sellerResponse = {
      id: seller._id,
      name: seller.name,
      email: seller.email,
      role: seller.role,
      status: seller.status,
      sellerInfo: seller.sellerInfo
    };
    
    console.log('Sending successful response');
    
    res.status(201).json({
      success: true,
      message: 'Seller registered successfully',
      token,
      user: sellerResponse
    });
  } catch (error) {
    console.error('Seller registration error:', error);
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const messages = {};
      
      // Extract specific validation error messages
      for (const field in error.errors) {
        messages[field] = error.errors[field].message;
      }
      
      console.log('Validation error details:', messages);
      
      // Return the specific validation error messages
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error registering seller',
      error: error.message
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }
    
    // Find user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email address'
      });
    }
    
    // Check if user is suspended
    if (user.status === 'Suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support for more information.',
        reason: user.suspensionReason
      });
    }
    
    // Check if seller application was rejected
    if (user.role === 'seller' && user.sellerInfo?.rejectionReason) {
      return res.status(403).json({
        success: false,
        message: 'Your seller application was rejected.',
        reason: user.sellerInfo.rejectionReason
      });
    }

    // Check if seller is not approved
    if (user.role === 'seller' && user.sellerInfo && !user.sellerInfo.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Your seller application is pending approval. Please wait for admin approval.',
        status: 'pending'
      });
    }
    
    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }
    
    // Generate token
    const token = user.generateAuthToken();
    
    // Remove password from response
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      sellerInfo: user.sellerInfo
    };
    
    res.status(200).json({
      success: true,
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login'
    });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (user) {
      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          addresses: user.addresses || [],
          phone: user.phone,
          status: user.status,
          createdAt: user.createdAt,
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, avatar, address, phone } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (avatar) updateData.avatar = avatar;
    if (address) updateData.address = address;
    if (phone) updateData.phone = phone;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Find user
    const user = await User.findById(req.user._id).select('+password');
    
    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};

// Google login
exports.googleLogin = async (req, res) => {
  try {
    const { username, email, profilePicture, googleId } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // If user exists, update their Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        await user.updateOne({ $set: { googleId } });
      }
    } else {
      // Create new user with default phone number for Google users
      user = await User.create({
        name: username,
        email,
        googleId,
        avatar: profilePicture,
        password: crypto.randomBytes(20).toString('hex'), // Random password for Google users
        phone: '0000000000', // Default phone number for Google users
        role: 'user',
        status: 'Active'
      });
    }

    // Generate token
    const token = user.generateAuthToken();

    res.status(200).json({
      success: true,
      message: 'Google login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status: user.status
      }
    });
  } catch (error) {
    console.warn('Google authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during Google authentication',
      error: error.message
    });
  }
};

// @desc    Get seller profile
// @route   GET /api/auth/seller-profile
// @access  Private (Seller only)
exports.getSellerProfile = async (req, res) => {
  try {
    console.log('Fetching seller profile for user:', req.user.id);
    
    const user = await User.findById(req.user.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get total products count
    const totalProducts = await Product.countDocuments({ seller: user._id });
    console.log('Total products:', totalProducts);

    // Get total sales and revenue
    const completedOrders = await Order.find({
      'items.seller': user._id,
      status: 'completed'
    });

    let totalSales = 0;
    let revenue = 0;

    completedOrders.forEach(order => {
      const sellerItems = order.items.filter(item => 
        item.seller && item.seller.toString() === user._id.toString()
      );
      
      sellerItems.forEach(item => {
        totalSales += item.quantity;
        revenue += (item.price * item.quantity);
      });
    });

    console.log('Sales and revenue:', { totalSales, revenue });

    // Format the seller data
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      avatar: user.avatar,
      sellerInfo: {
        businessName: user.sellerInfo?.businessName || '',
        location: user.sellerInfo?.location || '',
        description: user.sellerInfo?.description || '',
        isApproved: user.sellerInfo?.isApproved || false,
        totalSales: totalSales,
        totalProducts: totalProducts,
        sellerRating: user.sellerInfo?.sellerRating || 0,
        numberOfRatings: user.sellerInfo?.numberOfRatings || 0,
        revenue: revenue,
        joinedAsSeller: user.sellerInfo?.joinedAsSeller || user.createdAt
      }
    };

    console.log('Sending seller data:', userData);

    res.status(200).json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Error in getSellerProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching seller profile',
      error: error.message
    });
  }
};

// @desc    Update seller profile
// @route   PUT /api/auth/seller-profile
// @access  Private (Seller only)
exports.updateSellerProfile = async (req, res) => {
  try {
    const { sellerInfo, email, phone } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update seller info
    if (sellerInfo) {
      user.sellerInfo = {
        ...user.sellerInfo,
        ...sellerInfo
      };
    }

    // Update basic info
    if (email) user.email = email;
    if (phone) user.phone = phone;

    await user.save();

    // Get updated user data with additional info
    const totalProducts = await Product.countDocuments({ seller: user._id });
    const completedOrders = await Order.find({
      'items.seller': user._id,
      status: 'completed'
    });

    const revenue = completedOrders.reduce((total, order) => {
      const sellerItems = order.items.filter(item => item.seller.toString() === user._id.toString());
      return total + sellerItems.reduce((itemTotal, item) => itemTotal + (item.price * item.quantity), 0);
    }, 0);

    const userData = user.toObject();
    userData.sellerInfo = {
      ...userData.sellerInfo,
      totalProducts,
      revenue
    };

    res.status(200).json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Error in updateSellerProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating seller profile'
    });
  }
};

// Admin - Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving users',
      error: error.message
    });
  }
};

// Admin - Get pending seller approvals
exports.getPendingSellers = async (req, res) => {
  try {
    const pendingSellers = await User.find({
      role: 'seller',
      'sellerInfo.isApproved': false,
      'sellerInfo.rejectionReason': { $exists: false }
    }).select('-password').sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: pendingSellers.length,
      sellers: pendingSellers
    });
  } catch (error) {
    console.error('Error getting pending sellers:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving pending sellers',
      error: error.message
    });
  }
};

// Admin - Approve seller
exports.approveSeller = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.role !== 'seller') {
      return res.status(400).json({
        success: false,
        message: 'This user is not a seller'
      });
    }
    
    // Check if phone number is missing and set a default if needed
    if (!user.phone) {
      // Get phone from sellerInfo or set a placeholder
      let phone = '';
      
      // Try to extract from seller application if available
      if (user.sellerInfo && user.sellerInfo.phone) {
        phone = user.sellerInfo.phone;
      } else if (user.addresses && user.addresses.length > 0 && user.addresses[0].phoneNumber) {
        // Try to get from addresses if available
        phone = user.addresses[0].phoneNumber;
      } else {
        // Set a placeholder phone number
        // Note: In a real system, you would want to require the admin to provide this
        // or prompt the seller to complete their profile
        phone = '0000000000'; // Placeholder that matches the validation pattern
      }
      
      user.phone = phone;
    }
    
    user.sellerInfo.isApproved = true;
    user.sellerInfo.approvedAt = Date.now();
    user.status = 'Active'; // Update status to Active when seller is approved
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Seller approved successfully',
      user
    });
  } catch (error) {
    console.error('Error approving seller:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving seller',
      error: error.message
    });
  }
};

// Admin - Reject seller
exports.rejectSeller = async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.role !== 'seller') {
      return res.status(400).json({
        success: false,
        message: 'This user is not a seller'
      });
    }
    
    user.sellerInfo.isApproved = false;
    user.sellerInfo.rejectionReason = reason;
    // Keep status as Pending for rejected sellers
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Seller rejected successfully',
      user
    });
  } catch (error) {
    console.error('Error rejecting seller:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting seller',
      error: error.message
    });
  }
};

// Admin - Suspend user
exports.suspendUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Set status to Suspended
    user.status = 'Suspended';
    user.suspensionReason = reason || 'Violated terms of service';
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'User suspended successfully',
      user
    });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({
      success: false,
      message: 'Error suspending user',
      error: error.message
    });
  }
};

// Admin - Restore user
exports.restoreUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Set appropriate status based on user role and approval status
    if (user.role === 'seller' && !user.sellerInfo?.isApproved) {
      user.status = 'Pending'; // Restore sellers to pending if not yet approved
    } else {
      user.status = 'Active'; // Restore regular users to active
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'User restored successfully',
      user
    });
  } catch (error) {
    console.error('Error restoring user:', error);
    res.status(500).json({
      success: false,
      message: 'Error restoring user',
      error: error.message
    });
  }
};

// Send password reset OTP
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User with this email does not exist'
      });
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Create a unique ID for this OTP request
    const otpId = crypto.randomBytes(16).toString('hex');
    
    // Delete any existing OTPs for this user
    await OTP.deleteMany({ email });
    
    // Save the new OTP
    await OTP.create({
      email,
      otp,
      otpId
    });
    
    // Create email content
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Password Reset Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested a password reset for your HandCraft Store account.</p>
          <p>Your verification code is: <strong style="font-size: 18px; color: #4F46E5;">${otp}</strong></p>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this reset, please ignore this email or contact support if you have concerns.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated email. Please do not reply.
          </p>
        </div>
      `
    };
    
    // Send the email
    await transporter.sendMail(mailOptions);
    
    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      otpId
    });
  } catch (error) {
    console.error('Error in requestPasswordReset:', error);
    
    // Provide more specific error messages
    if (error.code === 'EAUTH') {
      return res.status(500).json({
        success: false,
        message: 'Email configuration error. Please contact support.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error sending OTP. Please try again later.'
    });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Find the OTP record
    const otpRecord = await OTP.findOne({ email });
    
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or invalid'
      });
    }
    
    // Verify the OTP
    if (otpRecord.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error('Error in verifyOTP:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP. Please try again later.'
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword, otp } = req.body;
    
    // Find the OTP record
    const otpRecord = await OTP.findOne({ email });
    
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or invalid'
      });
    }
    
    // Verify the OTP
    if (otpRecord.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }
    
    // Find the user
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update the password
    user.password = newPassword;
    await user.save();
    
    // Delete the OTP record
    await OTP.deleteOne({ email });
    
    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password. Please try again later.'
    });
  }
}; 