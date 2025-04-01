const jwt = require('jsonwebtoken');
const User = require('../model/userModel');

// Verify JWT token
exports.verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    console.log('Auth header received:', authHeader ? 'Present' : 'Not found');
    
    // Extract token, handling different formats
    let token;
    if (authHeader) {
      // Handle both "Bearer token" and just "token" formats
      token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : authHeader;
      console.log('Token extracted from header:', token.substring(0, 10) + '...');
    } else {
      console.log('No Authorization header found');
    }
    
    if (!token) {
      console.log('No token found in request');
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied'
      });
    }
    
    // Verify token
    console.log('Attempting to verify token');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified successfully, user ID:', decoded.id);
      
      // Find user by id
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        console.log('User not found for ID:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Check if user is suspended
      if (user.status === 'Suspended') {
        console.log('Suspended user attempting to access:', decoded.id);
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended. Please contact support for more information.',
          reason: user.suspensionReason || 'No reason provided'
        });
      }
      
      console.log('User found, role:', user.role);
      
      // Add user to request object
      req.user = user;
      next();
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Token verification failed: ' + jwtError.message
      });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

// Check if user is admin
exports.isAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin only'
      });
    }
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Check if user is seller
exports.isSeller = async (req, res, next) => {
  try {
    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Seller only'
      });
    }
    next();
  } catch (error) {
    console.error('Seller check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Optional authentication middleware
 * If token is valid, sets req.user
 * If no token or invalid token, continues without error
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // If no token, continue without authentication
    if (!token) {
      return next();
    }
    
    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user with matching id
      const user = await User.findById(decoded.id);
      
      // If user found and not suspended, attach to request
      if (user && user.status !== 'Suspended') {
        req.user = {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        };
      }
      
      next();
    } catch (err) {
      // If token is invalid, continue without user
      next();
    }
  } catch (err) {
    // If any other error, continue without user
    next();
  }
}; 