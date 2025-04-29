const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const EmailService = require('../utils/email.service');
const logger = require('../utils/logger');

class NotificationService {
  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @returns {Object} Created notification
   */
  async createNotification(notificationData) {
    try {
      // Create notification in database
      const notification = await Notification.createNotification(notificationData);

      // Process additional delivery methods based on user preferences
      await this.processAdditionalDeliveryMethods(notification);

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options (pagination, filtering)
   * @returns {Array} List of notifications
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        read,
        type
      } = options;

      // Find notifications with pagination
      const notifications = await Notification.findByUserWithPagination(userId, {
        page,
        limit,
        read,
        type
      });

      // Get total count for pagination
      const query = { user: userId };
      if (typeof read === 'boolean') {
        query.read = read;
      }
      if (type) {
        query.type = type;
      }
      const total = await Notification.countDocuments(query);

      return {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Updated notification
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findById(notificationId);

      if (!notification) {
        throw new Error('Notification not found');
      }

      // Ensure notification belongs to the user
      if (notification.user.toString() !== userId) {
        throw new Error('Unauthorized access to notification');
      }

      // Mark as read
      notification.read = true;
      await notification.save();

      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Object} Update result
   */
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { user: userId, read: false },
        { $set: { read: true } }
      );

      return {
        success: true,
        count: result.modifiedCount
      };
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Deletion result
   */
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findById(notificationId);

      if (!notification) {
        throw new Error('Notification not found');
      }

      // Ensure notification belongs to the user
      if (notification.user.toString() !== userId) {
        throw new Error('Unauthorized access to notification');
      }

      await notification.deleteOne();

      return {
        success: true,
        message: 'Notification deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences for a user
   * @param {string} userId - User ID
   * @param {Object} preferences - Notification preferences
   * @returns {Object} Updated user
   */
  async updatePreferences(userId, preferences) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Update email notification preferences
      if (preferences.emailNotifications) {
        user.preferences.emailNotifications = {
          ...user.preferences.emailNotifications,
          ...preferences.emailNotifications
        };
      }

      // Update push notification preferences
      if (preferences.pushNotifications) {
        user.preferences.pushNotifications = {
          ...user.preferences.pushNotifications,
          ...preferences.pushNotifications
        };
      }

      await user.save();

      return {
        success: true,
        preferences: {
          emailNotifications: user.preferences.emailNotifications,
          pushNotifications: user.preferences.pushNotifications
        }
      };
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   * @param {string} userId - User ID
   * @returns {Object} Unread count
   */
  async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        user: userId,
        read: false
      });

      return { count };
    } catch (error) {
      logger.error('Error getting unread notification count:', error);
      throw error;
    }
  }

  /**
   * Process additional delivery methods based on user preferences
   * @param {Object} notification - Notification object
   * @private
   */
  async processAdditionalDeliveryMethods(notification) {
    try {
      const user = await User.findById(notification.user);
      if (!user) return;

      // Check if email notifications are enabled for this type
      if (
        user.preferences.emailNotifications &&
        user.preferences.emailNotifications[notification.type]
      ) {
        await this.sendEmailNotification(notification, user);
      }

      // For push notifications, we would integrate with a push notification service
      if (
        user.preferences.pushNotifications &&
        user.preferences.pushNotifications[notification.type]
      ) {
        // This would be implemented when mobile app integration is added
        // await this.sendPushNotification(notification, user);
      }
    } catch (error) {
      logger.error('Error processing additional delivery methods:', error);
      // Don't throw to avoid interrupting the notification flow
    }
  }

  /**
   * Send email notification
   * @param {Object} notification - Notification object
   * @param {Object} user - User object
   * @private
   */
  async sendEmailNotification(notification, user) {
    try {
      await EmailService.sendNotificationEmail(
        user.email,
        notification.title,
        notification.message,
        notification.actionUrl
      );

      // Mark email as delivered
      notification.deliveryStatus.email.delivered = true;
      notification.deliveryStatus.email.deliveredAt = new Date();
      await notification.save();
    } catch (error) {
      logger.error('Error sending email notification:', error);
      // Don't throw to avoid interrupting the notification flow
    }
  }

  /**
   * Send system notification to all users or specific users
   * @param {Object} data - Notification data
   * @param {Array} userIds - Optional array of user IDs (send to all if not provided)
   * @returns {Object} Result
   */
  async sendSystemNotification(data, userIds = null) {
    try {
      let query = {};
      
      // If specific users are provided, send only to them
      if (userIds && Array.isArray(userIds) && userIds.length > 0) {
        query = { _id: { $in: userIds } };
      }
      
      // Find eligible users
      const users = await User.find(query).select('_id');
      
      // Create notifications for each user
      const notifications = [];
      
      for (const user of users) {
        const notification = await this.createNotification({
          user: user._id,
          type: 'system',
          title: data.title,
          message: data.message,
          priority: data.priority || 'normal',
          actionUrl: data.actionUrl,
          expiresAt: data.expiresAt,
          metadata: data.metadata
        });
        
        notifications.push(notification);
      }
      
      return {
        success: true,
        count: notifications.length
      };
    } catch (error) {
      logger.error('Error sending system notification:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();