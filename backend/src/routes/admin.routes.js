const express = require('express');
const { body, query, validationResult } = require('express-validator');
const UserService = require('../services/user.service');
const CreditService = require('../services/credit.service');
const NotificationService = require('../services/notification.service');
const { authenticate, authorizeAdmin } = require('../middleware/auth.middleware');
const router = express.Router();

// Apply authentication and admin authorization middleware to all admin routes
router.use(authenticate);
router.use(authorizeAdmin);

/**
 * @route GET /api/admin/users
 * @desc Get all users (with filtering and pagination)
 * @access Private (Admin only)
 */
router.get('/users', async (req, res, next) => {
  try {
    const {
      page,
      limit,
      sortBy,
      sortOrder,
      role,
      accountStatus,
      isEmailVerified,
      search
    } = req.query;
    
    const filter = {};
    
    // Apply filters if provided
    if (role) filter.role = role;
    if (accountStatus) filter.accountStatus = accountStatus;
    if (isEmailVerified !== undefined) filter.isEmailVerified = isEmailVerified === 'true';
    
    const users = await UserService.getAllUsers({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
      filter,
      search
    });
    
    res.status(200).json({
      success: true,
      users: users.users,
      pagination: users.pagination
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/admin/users/:id
 * @desc Get user by ID
 * @access Private (Admin only)
 */
router.get('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await UserService.getUserProfile(id);
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/admin/users/:id/role
 * @desc Update user role
 * @access Private (Admin only)
 */
router.put(
  '/users/:id/role',
  [
    body('role').isIn(['user', 'admin']).withMessage('Invalid role')
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
      
      const { id } = req.params;
      const { role } = req.body;
      const adminId = req.user._id;
      
      const result = await UserService.updateUserRole(id, role, adminId);
      
      res.status(200).json({
        success: true,
        message: result.message,
        user: result.user
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/admin/users/:id/status
 * @desc Update user account status
 * @access Private (Admin only)
 */
router.put(
  '/users/:id/status',
  [
    body('status').isIn(['active', 'suspended', 'deactivated']).withMessage('Invalid status'),
    body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
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
      
      const { id } = req.params;
      const { status, reason } = req.body;
      const adminId = req.user._id;
      
      const result = await UserService.updateUserStatus(id, status, adminId, reason);
      
      res.status(200).json({
        success: true,
        message: result.message,
        user: result.user
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/admin/users/:id/credits
 * @desc Adjust user credits
 * @access Private (Admin only)
 */
router.put(
  '/users/:id/credits',
  [
    body('amount').isInt().withMessage('Amount must be an integer'),
    body('description').notEmpty().trim().withMessage('Description is required')
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
      
      const { id } = req.params;
      const { amount, description } = req.body;
      const adminId = req.user._id;
      
      const result = await CreditService.adjustCredits(id, amount, description, adminId);
      
      res.status(200).json({
        success: true,
        message: `Credits adjusted successfully: ${amount > 0 ? '+' : ''}${amount}`,
        balance: result.balance,
        transaction: result.transaction
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/admin/reports
 * @desc Get content reports
 * @access Private (Admin only)
 */
router.get('/reports', async (req, res, next) => {
  try {
    // Load Report model on demand to avoid circular dependencies
    const Report = require('../models/report.model');
    
    const {
      page,
      limit,
      status,
      reason,
      sortBy,
      sortOrder
    } = req.query;
    
    // Build query
    const query = {};
    
    if (status) query.status = status;
    if (reason) query.reason = reason;
    
    // Determine sort options
    let sort = '-createdAt'; // Default sort
    
    if (sortBy) {
      sort = `${sortOrder === 'asc' ? '' : '-'}${sortBy}`;
    }
    
    // Find reports with pagination
    const reports = await Report.findWithPagination(query, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sort
    });
    
    // Get total count for pagination
    const total = await Report.countDocuments(query);
    
    res.status(200).json({
      success: true,
      reports,
      pagination: {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        total,
        pages: Math.ceil(total / (parseInt(limit) || 20))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/admin/reports/:id
 * @desc Review a report
 * @access Private (Admin only)
 */
router.put(
  '/reports/:id',
  [
    body('status').isIn(['reviewed', 'accepted', 'rejected']).withMessage('Invalid status'),
    body('adminNotes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
    body('actionTaken').isIn(['none', 'removed', 'flagged', 'other']).withMessage('Invalid action')
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
      
      // Load Report model on demand to avoid circular dependencies
      const Report = require('../models/report.model');
      
      const { id } = req.params;
      const { status, adminNotes, actionTaken } = req.body;
      const adminId = req.user._id;
      
      // Find report
      const report = await Report.findById(id);
      
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }
      
      // Update report status
      await report.markAsReviewed(adminId, status, adminNotes, actionTaken);
      
      // If action is to remove content and status is accepted
      if (actionTaken === 'removed' && status === 'accepted') {
        // Mark content as inappropriate
        const Content = require('../models/content.model');
        await Content.findByIdAndUpdate(
          report.content,
          {
            isInappropriate: true,
            inappropriateReason: report.reason
          }
        );
      }
      
      // Notify reporter
      if (status !== 'pending') {
        await report.notifyReporter();
      }
      
      res.status(200).json({
        success: true,
        message: `Report marked as ${status}`,
        report
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/admin/analytics
 * @desc Get admin analytics
 * @access Private (Admin only)
 */
router.get('/analytics', async (req, res, next) => {
  try {
    const User = require('../models/user.model');
    const Content = require('../models/content.model');
    const { CreditTransaction } = require('../models/credit.model');
    const Report = require('../models/report.model');
    
    // User stats
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ accountStatus: 'active' });
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    // Content stats
    const totalContent = await Content.countDocuments();
    const contentBySource = await Content.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $project: { source: '$_id', count: 1, _id: 0 } }
    ]);
    
    // Credit stats
    const totalCreditsEarned = await CreditTransaction.aggregate([
      { $match: { type: 'earn' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalCreditsSpent = await CreditTransaction.aggregate([
      { $match: { type: 'spend' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Report stats
    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });
    
    res.status(200).json({
      success: true,
      analytics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newToday: newUsersToday
        },
        content: {
          total: totalContent,
          bySource: contentBySource
        },
        credits: {
          totalEarned: totalCreditsEarned[0]?.total || 0,
          totalSpent: totalCreditsSpent[0]?.total || 0
        },
        reports: {
          total: totalReports,
          pending: pendingReports
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/admin/system-notification
 * @desc Send system notification to all users or specific users
 * @access Private (Admin only)
 */
router.post(
  '/system-notification',
  [
    body('title').notEmpty().trim().withMessage('Title is required'),
    body('message').notEmpty().trim().withMessage('Message is required'),
    body('userIds').optional().isArray().withMessage('User IDs must be an array'),
    body('priority').optional().isIn(['low', 'normal', 'high']).withMessage('Invalid priority'),
    body('actionUrl').optional().isURL().withMessage('Action URL must be a valid URL')
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
      
      const { title, message, userIds, priority, actionUrl } = req.body;
      
      const result = await NotificationService.sendSystemNotification(
        {
          title,
          message,
          priority: priority || 'normal',
          actionUrl
        },
        userIds
      );
      
      res.status(200).json({
        success: true,
        message: `System notification sent to ${result.count} user(s)`
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/admin/search/users
 * @desc Search users
 * @access Private (Admin only)
 */
router.get('/search/users', async (req, res, next) => {
  try {
    const { q, page, limit } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const results = await UserService.searchUsers(q, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    
    res.status(200).json({
      success: true,
      users: results.users,
      pagination: results.pagination
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;