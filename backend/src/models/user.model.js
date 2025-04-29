const express = require('express');
const { body, validationResult } = require('express-validator');
const NotificationService = require('../services/notification.service');
const { authenticate } = require('../middleware/auth.middleware');
const router = express.Router();

// Apply authentication middleware to all notification routes
router.use(authenticate);

/**
 * @route GET /api/notifications
 * @desc Get user notifications
 * @access Private
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page, limit, read, type } = req.query;
    
    const notifications = await NotificationService.getUserNotifications(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      read: read === 'true' ? true : (read === 'false' ? false : undefined),
      type
    });
    
    res.status(200).json({
      success: true,
      notifications: notifications.notifications,
      pagination: notifications.pagination
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/notifications/unread-count
 * @desc Get unread notification count
 * @access Private
 */
router.get('/unread-count', async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const result = await NotificationService.getUnreadCount(userId);
    
    res.status(200).json({
      success: true,
      count: result.count
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/notifications/:id/read
 * @desc Mark notification as read
 * @access Private
 */
router.put('/:id/read', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    
    const notification = await NotificationService.markAsRead(id, userId);
    
    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private
 */
router.put('/read-all', async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const result = await NotificationService.markAllAsRead(userId);
    
    res.status(200).json({
      success: true,
      message: `${result.count} notifications marked as read`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/notifications/:id
 * @desc Delete a notification
 * @access Private
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    
    const result = await NotificationService.deleteNotification(id, userId);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/notifications/preferences
 * @desc Update notification preferences
 * @access Private
 */
router.put(
  '/preferences',
  [
    body('emailNotifications').optional().isObject().withMessage('Email notifications must be an object'),
    body('pushNotifications').optional().isObject().withMessage('Push notifications must be an object')
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
      const preferences = req.body;
      
      const result = await NotificationService.updatePreferences(userId, preferences);
      
      res.status(200).json({
        success: true,
        message: 'Notification preferences updated successfully',
        preferences: result.preferences
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;