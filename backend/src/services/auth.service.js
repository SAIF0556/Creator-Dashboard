const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');
const { CreditBalance } = require('../models/credit.model');
const NotificationService = require('./notification.service');
const EmailService = require('../utils/email.service');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User data object
   * @returns {Object} Created user and tokens
   */
  async register(userData) {
    try {
      // Check if user with this email already exists
      const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
      if (existingUser) {
        throw new Error('Email is already registered');
      }

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user with verification token
      const user = new User({
        ...userData,
        email: userData.email.toLowerCase(),
        emailVerificationToken,
        emailVerificationExpires
      });

      // Save the user
      await user.save();

      // Create credit balance for the user
      await CreditBalance.create({
        user: user._id,
        balance: 0
      });

      // Send verification email
      await EmailService.sendVerificationEmail(user.email, emailVerificationToken);

      // Create welcome notification
      await NotificationService.createNotification({
        user: user._id,
        type: 'system',
        title: 'Welcome to Creator Dashboard',
        message: 'Thank you for joining our platform. Please verify your email to unlock all features.',
        priority: 'high'
      });

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(user);

      return {
        user: this.sanitizeUser(user),
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login a user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object} User and tokens
   */
  async login(email, password) {
    try {
      // Find the user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user account is active
      if (user.accountStatus !== 'active') {
        throw new Error(`Your account is ${user.accountStatus}. Please contact support.`);
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(user);

      // Check if daily login reward should be given
      await this.handleDailyLoginReward(user._id);

      return {
        user: this.sanitizeUser(user),
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Verify user's email
   * @param {string} token - Verification token
   * @returns {Object} Success message and user
   */
  async verifyEmail(token) {
    try {
      // Find user with matching token that hasn't expired
      const user = await User.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new Error('Invalid or expired verification token');
      }

      // Update user verification status
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      // Award credits for email verification if first time
      const creditBalance = await CreditBalance.findOne({ user: user._id });
      if (creditBalance) {
        await creditBalance.addCredits(
          20,
          'profile_completion',
          'Email verification reward',
          { action: 'email_verified' }
        );
      }

      // Create notification for successful verification
      await NotificationService.createNotification({
        user: user._id,
        type: 'system',
        title: 'Email Verified',
        message: 'Your email has been successfully verified. You now have full access to all features.',
        priority: 'normal'
      });

      return {
        message: 'Email successfully verified',
        user: this.sanitizeUser(user)
      };
    } catch (error) {
      logger.error('Email verification error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Boolean} Success status
   */
  async requestPasswordReset(email) {
    try {
      // Find user with this email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // For security reasons, we don't want to reveal if the email exists or not
        return true;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

      // Save token to user
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = resetExpires;
      await user.save();

      // Send password reset email
      await EmailService.sendPasswordResetEmail(user.email, resetToken);

      return true;
    } catch (error) {
      logger.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Object} Success message
   */
  async resetPassword(token, newPassword) {
    try {
      // Find user with matching token that hasn't expired
      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Update password and clear token
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      // Create notification for password change
      await NotificationService.createNotification({
        user: user._id,
        type: 'system',
        title: 'Password Changed',
        message: 'Your password has been successfully changed.',
        priority: 'high'
      });

      return {
        message: 'Password successfully reset'
      };
    } catch (error) {
      logger.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} New tokens
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      
      // Find user
      const user = await User.findById(decoded.userId);
      if (!user || user.accountStatus !== 'active') {
        throw new Error('Invalid token or inactive user');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      return tokens;
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Object} Success message
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Find user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Create notification for password change
      await NotificationService.createNotification({
        user: user._id,
        type: 'system',
        title: 'Password Changed',
        message: 'Your password has been successfully changed.',
        priority: 'high'
      });

      return {
        message: 'Password successfully changed'
      };
    } catch (error) {
      logger.error('Password change error:', error);
      throw error;
    }
  }

  /**
   * Generate JWT tokens
   * @param {Object} user - User object
   * @returns {Object} Access and refresh tokens
   */
  generateTokens(user) {
    const accessToken = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Handle daily login rewards
   * @param {string} userId - User ID
   */
  async handleDailyLoginReward(userId) {
    try {
      const creditBalance = await CreditBalance.findOne({ user: userId });
      if (!creditBalance) return;

      const now = new Date();
      const lastReward = creditBalance.lastDailyLoginReward;
      
      // Check if user is eligible for daily reward (last reward was more than 20 hours ago)
      if (!lastReward || (now - lastReward) > 20 * 60 * 60 * 1000) {
        // Add daily login credits
        const dailyCredits = parseInt(process.env.DAILY_LOGIN_CREDITS) || 10;
        
        await creditBalance.addCredits(
          dailyCredits,
          'daily_login',
          'Daily login reward',
          { date: now }
        );

        // Create notification for daily reward
        await NotificationService.createNotification({
          user: userId,
          type: 'credit',
          title: 'Daily Login Reward',
          message: `You've received ${dailyCredits} credits for logging in today!`,
          priority: 'normal',
          relatedEntity: {
            entityType: 'credit',
            entityId: creditBalance._id
          }
        });
      }
    } catch (error) {
      logger.error('Daily login reward error:', error);
      // Don't throw the error to avoid interrupting the login process
    }
  }

  /**
   * Sanitize user object for client
   * @param {Object} user - User object
   * @returns {Object} Sanitized user object
   */
  sanitizeUser(user) {
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.emailVerificationToken;
    delete userObj.emailVerificationExpires;
    delete userObj.passwordResetToken;
    delete userObj.passwordResetExpires;
    return userObj;
  }
}

module.exports = new AuthService();