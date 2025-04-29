const User = require('../models/user.model');
const CreditService = require('./credit.service');
const NotificationService = require('./notification.service');
const EmailService = require('../utils/email.service');
const crypto = require('crypto');
const logger = require('../utils/logger');

class UserService {
  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {Object} User profile
   */
  async getUserProfile(userId) {
    try {
      const user = await User.findById(userId).select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires');
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} profileData - Profile data to update
   * @returns {Object} Updated user profile
   */
  async updateUserProfile(userId, profileData) {
    try {
      // Find user
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Get old profile completion percentage
      const oldPercentage = user.profileCompletionPercentage;
      
      // Allowed fields to update
      const allowedFields = [
        'firstName',
        'lastName',
        'profileImage',
        'bio'
      ];
      
      // Update allowed fields
      allowedFields.forEach(field => {
        if (profileData[field] !== undefined) {
          user[field] = profileData[field];
        }
      });
      
      // Update preferences if provided
      if (profileData.preferences) {
        if (profileData.preferences.contentSources) {
          user.preferences.contentSources = {
            ...user.preferences.contentSources,
            ...profileData.preferences.contentSources
          };
        }
        
        if (profileData.preferences.contentCategories) {
          user.preferences.contentCategories = profileData.preferences.contentCategories;
        }
        
        if (profileData.preferences.emailNotifications) {
          user.preferences.emailNotifications = {
            ...user.preferences.emailNotifications,
            ...profileData.preferences.emailNotifications
          };
        }
        
        if (profileData.preferences.pushNotifications) {
          user.preferences.pushNotifications = {
            ...user.preferences.pushNotifications,
            ...profileData.preferences.pushNotifications
          };
        }
      }
      
      // Calculate new profile completion percentage
      const newPercentage = user.calculateProfileCompletion();
      
      // Save user
      await user.save();
      
      // Process profile completion rewards if completion percentage increased
      if (newPercentage > oldPercentage) {
        await CreditService.processProfileCompletionRewards(
          userId,
          oldPercentage,
          newPercentage
        );
      }
      
      return user;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Update user email
   * @param {string} userId - User ID
   * @param {string} newEmail - New email address
   * @param {string} password - Current password for verification
   * @returns {Object} Result
   */
  async updateEmail(userId, newEmail, password) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }
      
      // Check if email is already in use
      const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
      if (existingUser) {
        throw new Error('Email is already registered');
      }
      
      // Generate verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Update user
      user.email = newEmail.toLowerCase();
      user.isEmailVerified = false;
      user.emailVerificationToken = emailVerificationToken;
      user.emailVerificationExpires = emailVerificationExpires;
      
      await user.save();
      
      // Send verification email
      await EmailService.sendVerificationEmail(newEmail, emailVerificationToken);
      
      // Create notification
      await NotificationService.createNotification({
        user: userId,
        type: 'system',
        title: 'Email Updated',
        message: 'Your email has been updated. Please verify your new email address.',
        priority: 'high'
      });
      
      return {
        message: 'Email updated successfully. Please verify your new email address.'
      };
    } catch (error) {
      logger.error('Error updating email:', error);
      throw error;
    }
  }

  /**
   * Get user activity
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} User activity
   */
  async getUserActivity(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type = null
      } = options;
      
      // Get credit transactions
      const creditActivity = await CreditService.getTransactionHistory(userId, {
        page,
        limit,
        type
      });
      
      // Get recent notifications
      const notifications = await NotificationService.getUserNotifications(userId, {
        page,
        limit: 10,
        type
      });
      
      // In a real application, you might want to include other types of activity
      // such as saved content, shared content, etc.
      
      return {
        credits: creditActivity,
        notifications: notifications.notifications
      };
    } catch (error) {
      logger.error('Error getting user activity:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   * @param {string} userId - User ID
   * @param {string} password - Current password for verification
   * @returns {Object} Result
   */
  async deleteAccount(userId, password) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }
      
      // Update account status to deactivated
      user.accountStatus = 'deactivated';
      await user.save();
      
      // In a real application, you might want to:
      // 1. Delete or anonymize user data
      // 2. Delete associated records (saved content, etc.)
      // 3. Send a confirmation email
      
      return {
        message: 'Account deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting account:', error);
      throw error;
    }
  }

  /**
   * Get user stats
   * @param {string} userId - User ID
   * @returns {Object} User stats
   */
  async getUserStats(userId) {
    try {
      // Get user
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Get credit balance
      const creditBalance = await CreditService.getBalance(userId);
      
      // Get saved content count
      const SavedContent = require('../models/savedContent.model');
      const savedContentCount = await SavedContent.countDocuments({ user: userId });
      
      // Get notification counts
      const Notification = require('../models/notification.model');
      const totalNotifications = await Notification.countDocuments({ user: userId });
      const unreadNotifications = await Notification.countDocuments({ user: userId, read: false });
      
      // Get account age in days
      const accountAge = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        credits: {
          balance: creditBalance.balance,
          totalEarned: creditBalance.totalEarned,
          totalSpent: creditBalance.totalSpent
        },
        savedContent: savedContentCount,
        notifications: {
          total: totalNotifications,
          unread: unreadNotifications
        },
        profile: {
          completionPercentage: user.profileCompletionPercentage,
          isEmailVerified: user.isEmailVerified,
          accountAge
        }
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - Notification preferences
   * @returns {Object} Updated notification preferences
   */
  async updateNotificationPreferences(userId, preferences) {
    try {
      const result = await NotificationService.updatePreferences(userId, preferences);
      return result;
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get all users (admin function)
   * @param {Object} options - Query options
   * @returns {Array} Users
   */
  async getAllUsers(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        filter = {},
        search = null
      } = options;
      
      // Build query
      let query = {};
      
      // Apply filters
      if (filter.role) {
        query.role = filter.role;
      }
      
      if (filter.accountStatus) {
        query.accountStatus = filter.accountStatus;
      }
      
      if (filter.isEmailVerified !== undefined) {
        query.isEmailVerified = filter.isEmailVerified;
      }
      
      // Apply search
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Determine sort options
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      // Execute query with pagination
      const users = await User.find(query)
        .select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires')
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit);
      
      // Get total count for pagination
      const total = await User.countDocuments(query);
      
      return {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  }

  /**
   * Update user role (admin function)
   * @param {string} userId - User ID
   * @param {string} role - New role
   * @param {string} adminId - Admin user ID
   * @returns {Object} Updated user
   */
  async updateUserRole(userId, role, adminId) {
    try {
      if (!['user', 'admin'].includes(role)) {
        throw new Error('Invalid role');
      }
      
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update role
      user.role = role;
      await user.save();
      
      // Log the action
      logger.info(`User role updated: ${userId} to ${role} by admin ${adminId}`);
      
      // Create notification
      await NotificationService.createNotification({
        user: userId,
        type: 'admin',
        title: 'Account Role Updated',
        message: `Your account role has been updated to ${role}.`,
        priority: 'high'
      });
      
      return {
        message: 'User role updated successfully',
        user
      };
    } catch (error) {
      logger.error('Error updating user role:', error);
      throw error;
    }
  }

  /**
   * Update user account status (admin function)
   * @param {string} userId - User ID
   * @param {string} status - New account status
   * @param {string} adminId - Admin user ID
   * @param {string} reason - Reason for status change
   * @returns {Object} Updated user
   */
  async updateUserStatus(userId, status, adminId, reason = '') {
    try {
      if (!['active', 'suspended', 'deactivated'].includes(status)) {
        throw new Error('Invalid account status');
      }
      
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update status
      const previousStatus = user.accountStatus;
      user.accountStatus = status;
      await user.save();
      
      // Log the action
      logger.info(`User status updated: ${userId} from ${previousStatus} to ${status} by admin ${adminId}. Reason: ${reason}`);
      
      // Create notification if account is being suspended or reactivated
      if (status === 'suspended') {
        await NotificationService.createNotification({
          user: userId,
          type: 'admin',
          title: 'Account Suspended',
          message: `Your account has been suspended. Reason: ${reason || 'Violation of terms of service'}`,
          priority: 'high'
        });
        
        // Send email notification
        await EmailService.sendEmail({
          to: user.email,
          subject: 'Your Account Has Been Suspended',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Account Suspension Notice</h2>
              <p>Your Creator Dashboard account has been suspended.</p>
              <p><strong>Reason:</strong> ${reason || 'Violation of terms of service'}</p>
              <p>If you believe this is an error, please contact our support team for assistance.</p>
              <hr style="margin: 30px 0;">
              <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} Creator Dashboard. All rights reserved.</p>
            </div>
          `
        });
      } else if (status === 'active' && previousStatus !== 'active') {
        await NotificationService.createNotification({
          user: userId,
          type: 'admin',
          title: 'Account Reactivated',
          message: 'Your account has been reactivated. You now have full access to all features.',
          priority: 'high'
        });
        
        // Send email notification
        await EmailService.sendEmail({
          to: user.email,
          subject: 'Your Account Has Been Reactivated',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Account Reactivation Notice</h2>
              <p>Good news! Your Creator Dashboard account has been reactivated.</p>
              <p>You now have full access to all features and services.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/login" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Login to Your Account</a>
              </div>
              <hr style="margin: 30px 0;">
              <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} Creator Dashboard. All rights reserved.</p>
            </div>
          `
        });
      }
      
      return {
        message: 'User status updated successfully',
        user
      };
    } catch (error) {
      logger.error('Error updating user status:', error);
      throw error;
    }
  }

  /**
   * Admin user search
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Search results
   */
  async searchUsers(query, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        fields = ['email', 'firstName', 'lastName']
      } = options;
      
      // Build search query
      const searchQuery = {
        $or: fields.map(field => ({
          [field]: { $regex: query, $options: 'i' }
        }))
      };
      
      // Execute query with pagination
      const users = await User.find(searchQuery)
        .select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      
      // Get total count for pagination
      const total = await User.countDocuments(searchQuery);
      
      return {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }
}

module.exports = new UserService();