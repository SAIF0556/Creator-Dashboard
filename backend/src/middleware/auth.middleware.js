const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate JWT tokens
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by id from decoded token
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. User not found.' 
      });
    }
    
    // Check if user account is active
    if (user.accountStatus !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: `Your account is ${user.accountStatus}. Please contact support.` 
      });
    }

    // Add user info to request object
    req.user = user;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired.' 
      });
    }
    
    logger.error('Authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error during authentication.' 
    });
  }
};

/**
 * Middleware to authorize admin access
 */
exports.authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};

/**
 * Middleware to authorize verified email
 */
exports.authorizeVerifiedEmail = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({ 
      success: false, 
      message: 'Email verification required for this operation.' 
    });
  }
  next();
};

/**
 * Factory function to create middleware that checks for specific permissions
 * @param {String} requiredPermission - Permission required for access
 * @returns {Function} Middleware function
 */
exports.authorizePermission = (requiredPermission) => {
  return (req, res, next) => {
    // For now, we're assuming all permissions are admin-only
    // In a more complex system, you might have a permissions array in the user object
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };
};

/**
 * Middleware to authenticate using refresh token
 */
exports.authenticateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Refresh token is required.' 
      });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Find user by id from decoded token
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid refresh token. User not found.' 
      });
    }
    
    // Check if user account is active
    if (user.accountStatus !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: `Your account is ${user.accountStatus}. Please contact support.` 
      });
    }

    // Add user info to request object
    req.user = user;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid refresh token.' 
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Refresh token expired.' 
      });
    }
    
    logger.error('Refresh token authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error during authentication.' 
    });
  }
};