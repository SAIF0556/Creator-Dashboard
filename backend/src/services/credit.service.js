const { CreditBalance, CreditTransaction } = require('../models/credit.model');
const NotificationService = require('./notification.service');
const logger = require('../utils/logger');

class CreditService {
  /**
   * Get credit balance for a user
   * @param {string} userId - User ID
   * @returns {Object} User's credit balance
   */
  async getBalance(userId) {
    try {
      let creditBalance = await CreditBalance.findOne({ user: userId });
      
      // If no balance exists, create one
      if (!creditBalance) {
        creditBalance = await CreditBalance.create({
          user: userId,
          balance: 0
        });
      }
      
      return creditBalance;
    } catch (error) {
      logger.error('Error getting credit balance:', error);
      throw error;
    }
  }

  /**
   * Add credits to a user's balance
   * @param {string} userId - User ID
   * @param {number} amount - Amount of credits to add
   * @param {string} category - Transaction category
   * @param {string} description - Transaction description
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Updated credit balance and transaction
   */
  async addCredits(userId, amount, category, description, metadata = {}) {
    try {
      // Validate amount
      const creditAmount = parseInt(amount);
      if (isNaN(creditAmount) || creditAmount <= 0) {
        throw new Error('Invalid credit amount');
      }
      
      let creditBalance = await CreditBalance.findOne({ user: userId });
      
      // If no balance exists, create one
      if (!creditBalance) {
        creditBalance = await CreditBalance.create({
          user: userId,
          balance: 0
        });
      }
      
      // Add credits and create transaction
      const transaction = await creditBalance.addCredits(
        creditAmount,
        category,
        description,
        metadata
      );
      
      // Create notification
      await NotificationService.createNotification({
        user: userId,
        type: 'credit',
        title: 'Credits Added',
        message: `${creditAmount} credits have been added to your account: ${description}`,
        relatedEntity: {
          entityType: 'credit',
          entityId: transaction._id
        }
      });
      
      return {
        balance: creditBalance,
        transaction
      };
    } catch (error) {
      logger.error('Error adding credits:', error);
      throw error;
    }
  }

  /**
   * Deduct credits from a user's balance
   * @param {string} userId - User ID
   * @param {number} amount - Amount of credits to deduct
   * @param {string} category - Transaction category
   * @param {string} description - Transaction description
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Updated credit balance and transaction
   */
  async deductCredits(userId, amount, category, description, metadata = {}) {
    try {
      // Validate amount
      const creditAmount = parseInt(amount);
      if (isNaN(creditAmount) || creditAmount <= 0) {
        throw new Error('Invalid credit amount');
      }
      
      const creditBalance = await CreditBalance.findOne({ user: userId });
      
      // If no balance exists or insufficient credits
      if (!creditBalance) {
        throw new Error('Credit balance not found');
      }
      
      if (creditBalance.balance < creditAmount) {
        throw new Error('Insufficient credits');
      }
      
      // Deduct credits and create transaction
      const transaction = await creditBalance.deductCredits(
        creditAmount,
        category,
        description,
        metadata
      );
      
      // Create notification
      await NotificationService.createNotification({
        user: userId,
        type: 'credit',
        title: 'Credits Deducted',
        message: `${creditAmount} credits have been deducted from your account: ${description}`,
        relatedEntity: {
          entityType: 'credit',
          entityId: transaction._id
        }
      });
      
      return {
        balance: creditBalance,
        transaction
      };
    } catch (error) {
      logger.error('Error deducting credits:', error);
      throw error;
    }
  }

  /**
   * Adjust credits (admin function)
   * @param {string} userId - User ID
   * @param {number} amount - Amount of credits to adjust (positive or negative)
   * @param {string} description - Adjustment description
   * @param {string} adminId - Admin user ID
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Updated credit balance and transaction
   */
  async adjustCredits(userId, amount, description, adminId, metadata = {}) {
    try {
      // Validate amount
      const adjustmentAmount = parseInt(amount);
      if (isNaN(adjustmentAmount) || adjustmentAmount === 0) {
        throw new Error('Invalid adjustment amount');
      }
      
      let creditBalance = await CreditBalance.findOne({ user: userId });
      
      // If no balance exists, create one
      if (!creditBalance) {
        creditBalance = await CreditBalance.create({
          user: userId,
          balance: 0
        });
      }
      
      // Add admin info to metadata
      const adjustmentMetadata = {
        ...metadata,
        adjustedBy: adminId,
        adjustedAt: new Date()
      };
      
      // Adjust credits and create transaction
      const transaction = await creditBalance.adjustCredits(
        adjustmentAmount,
        description,
        adjustmentMetadata
      );
      
      // Create notification
      const action = adjustmentAmount > 0 ? 'added to' : 'deducted from';
      const absAmount = Math.abs(adjustmentAmount);
      
      await NotificationService.createNotification({
        user: userId,
        type: 'credit',
        title: 'Credit Balance Adjusted',
        message: `${absAmount} credits have been ${action} your account by an administrator: ${description}`,
        priority: 'high',
        relatedEntity: {
          entityType: 'credit',
          entityId: transaction._id
        }
      });
      
      return {
        balance: creditBalance,
        transaction
      };
    } catch (error) {
      logger.error('Error adjusting credits:', error);
      throw error;
    }
  }

  /**
   * Get credit transaction history for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options (pagination, filtering)
   * @returns {Array} List of transactions
   */
  async getTransactionHistory(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        startDate,
        endDate,
        category,
        type
      } = options;
      
      const query = { user: userId };
      
      // Apply date filters
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
        }
      }
      
      // Apply category filter
      if (category) {
        query.category = category;
      }
      
      // Apply type filter
      if (type) {
        query.type = type;
      }
      
      // Find transactions with pagination
      const transactions = await CreditTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      
      // Get total count for pagination
      const total = await CreditTransaction.countDocuments(query);
      
      return {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting transaction history:', error);
      throw error;
    }
  }

  /**
   * Get credit transaction categories
   * @returns {Array} List of transaction categories
   */
  async getTransactionCategories() {
    return [
      'daily_login',
      'profile_completion',
      'content_interaction',
      'special_event',
      'admin_adjustment',
      'feature_usage',
      'other'
    ];
  }

  /**
   * Check if user has enough credits for a feature
   * @param {string} userId - User ID
   * @param {number} requiredAmount - Required credit amount
   * @returns {Boolean} Whether user has enough credits
   */
  async hasEnoughCredits(userId, requiredAmount) {
    try {
      const creditBalance = await this.getBalance(userId);
      return creditBalance.balance >= requiredAmount;
    } catch (error) {
      logger.error('Error checking credit balance:', error);
      throw error;
    }
  }

  /**
   * Process profile completion rewards
   * @param {string} userId - User ID
   * @param {number} oldPercentage - Old completion percentage
   * @param {number} newPercentage - New completion percentage
   */
  async processProfileCompletionRewards(userId, oldPercentage, newPercentage) {
    try {
      // Define milestone percentages and rewards
      const milestones = [
        { percentage: 25, credits: 10, description: 'Profile 25% complete' },
        { percentage: 50, credits: 15, description: 'Profile 50% complete' },
        { percentage: 75, credits: 25, description: 'Profile 75% complete' },
        { percentage: 100, credits: 50, description: 'Profile 100% complete' }
      ];
      
      // Check each milestone to see if user has newly reached it
      for (const milestone of milestones) {
        if (oldPercentage < milestone.percentage && newPercentage >= milestone.percentage) {
          // Award credits for reaching this milestone
          await this.addCredits(
            userId,
            milestone.credits,
            'profile_completion',
            milestone.description,
            { milestone: milestone.percentage }
          );
        }
      }
    } catch (error) {
      logger.error('Error processing profile completion rewards:', error);
      // Don't throw error to avoid interrupting the profile update process
    }
  }

  /**
   * Award credits for content interaction
   * @param {string} userId - User ID
   * @param {string} contentId - Content ID
   * @param {string} interactionType - Type of interaction
   * @returns {Object} Transaction result
   */
  async awardContentInteractionCredits(userId, contentId, interactionType) {
    try {
      // Define credit rewards for different interaction types
      const rewards = {
        save: 2,
        share: 5,
        comment: 3
      };
      
      const credits = rewards[interactionType] || 1;
      
      // Award credits
      return await this.addCredits(
        userId,
        credits,
        'content_interaction',
        `Credits for ${interactionType} interaction`,
        { contentId, interactionType }
      );
    } catch (error) {
      logger.error('Error awarding content interaction credits:', error);
      throw error;
    }
  }
}

module.exports = new CreditService();