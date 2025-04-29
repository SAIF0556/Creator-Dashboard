const express = require('express');
const { body, validationResult } = require('express-validator');
const UserService = require('../services/user.service');
const CreditService = require('../services/credit.service');
const { authenticate, authorizeVerifiedEmail } = require('../middleware/auth.middleware');
const router = express.Router();

// Apply authentication middleware to all user routes
router.use(authenticate);

/**
 * @route GET /api/users/profile
 * @desc Get user profile
 * @access Private
 */
router.get('/profile', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await UserService.getUserProfile(userId);
    
    res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/users/profile
 * @desc Update user profile
 * @access Private
 */
router.put(
  '/profile',
  [
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
    body('profileImage').optional().isURL().withMessage('Profile image must be a valid URL')
  ],
  async (req, res, next) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const userId = req.user._id;
      const profileData = req.body;
      
      const updatedProfile = await UserService.updateUserProfile(userId, profileData);
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        profile: updatedProfile
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/users/email
 * @desc Update user email
 * @access Private
 */
router.put(
  '/email',
  [
    body('newEmail').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res, next) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const userId = req.user._id;
      const { newEmail, password } = req.body;
      
      const result = await UserService.updateEmail(userId, newEmail, password);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/users/activity
 * @desc Get user activity
 * @access Private
 */
router.get('/activity', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page, limit, type } = req.query;
    
    const activity = await UserService.getUserActivity(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      type
    });
    
    res.status(200).json({
      success: true,
      activity
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/users/credits
 * @desc Get user credit balance and transactions
 * @access Private
 */
router.get('/credits', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page, limit, category, type, startDate, endDate } = req.query;
    
    // Get credit balance
    const balance = await CreditService.getBalance(userId);
    
    // Get transaction history with pagination
    const transactions = await CreditService.getTransactionHistory(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      category,
      type,
      startDate,
      endDate
    });
    
    res.status(200).json({
      success: true,
      credits: {
        balance: balance.balance,
        totalEarned: balance.totalEarned,
        totalSpent: balance.totalSpent,
        transactions: transactions.transactions,
        pagination: transactions.pagination
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/users/saved-content
 * @desc Get user's saved content
 * @access Private
 */
router.get('/saved-content', async (req, res, next) => {
  try {
    // Load feed service on demand to avoid circular dependencies
    const FeedService = require('../services/feed.service');
    
    const userId = req.user._id;
    const { page, limit, folder, tags, sort } = req.query;
    
    // Parse tags as array if provided
    const parsedTags = tags ? (Array.isArray(tags) ? tags : [tags]) : undefined;
    
    const savedContent = await FeedService.getSavedContent(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      folder,
      tags: parsedTags,
      sort: sort || '-savedAt'
    });
    
    res.status(200).json({
      success: true,
      savedContent: savedContent.items,
      pagination: savedContent.pagination
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/users/saved-content/folders
 * @desc Get user's saved content folders
 * @access Private
 */
router.get('/saved-content/folders', async (req, res, next) => {
  try {
    // Load feed service on demand to avoid circular dependencies
    const FeedService = require('../services/feed.service');
    
    const userId = req.user._id;
    
    const folders = await FeedService.getSavedContentFolders(userId);
    
    res.status(200).json({
      success: true,
      folders
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/users/stats
 * @desc Get user stats
 * @access Private
 */
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const stats = await UserService.getUserStats(userId);
    
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/users/notification-preferences
 * @desc Update user notification preferences
 * @access Private
 */
router.put('/notification-preferences', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const preferences = req.body;
    
    const result = await UserService.updateNotificationPreferences(userId, preferences);
    
    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: result.preferences
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/users/account
 * @desc Delete user account
 * @access Private
 */
router.delete(
  '/account',
  [
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res, next) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const userId = req.user._id;
      const { password } = req.body;
      
      const result = await UserService.deleteAccount(userId, password);
      
      // Clear refresh token cookie
      res.clearCookie('refreshToken');
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;