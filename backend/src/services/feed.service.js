const Content = require('../models/content.model');
const User = require('../models/user.model');
const SavedContent = require('../models/savedContent.model');
const TwitterService = require('./twitter.service');
const RedditService = require('./reddit.service');
const CreditService = require('./credit.service');
const logger = require('../utils/logger');

class FeedService {
  /**
   * Get personalized feed for a user
   * @param {string} userId - User ID
   * @param {Object} options - Feed options
   * @returns {Array} Feed items
   */
  async getUserFeed(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sources = null,
        categories = null,
        sortBy = 'recent',
        isRefresh = false
      } = options;

      // Get user preferences
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Determine which sources to include
      const includeSources = sources || this.getEnabledSourcesFromPreferences(user);
      
      // Determine which categories to include
      const includeCategories = categories || user.preferences?.contentCategories || [];

      // If this is a refresh request, fetch new content
      if (isRefresh) {
        await this.refreshFeedContent(includeSources);
      }

      // Build query for fetching content
      const query = {
        isInappropriate: false
      };

      // Filter by sources
      if (includeSources && includeSources.length > 0) {
        query.source = { $in: includeSources };
      }

      // Filter by categories if specified
      if (includeCategories && includeCategories.length > 0) {
        query.categories = { $in: includeCategories };
      }

      // Determine sort order
      let sortOptions = {};
      
      switch (sortBy) {
        case 'popular':
          sortOptions = { 'engagement.totalEngagement': -1 };
          break;
        case 'recent':
        default:
          sortOptions = { contentCreatedAt: -1 };
      }

      // Fetch content with pagination
      const feedItems = await Content.find(query)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit);

      // Get total count for pagination
      const total = await Content.countDocuments(query);

      // Add flags for already saved content
      const savedContentIds = await this.getUserSavedContentIds(userId);
      
      const feedWithSavedStatus = feedItems.map(item => {
        const itemObj = item.toObject();
        itemObj.isSaved = savedContentIds.includes(item._id.toString());
        return itemObj;
      });

      return {
        items: feedWithSavedStatus,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching user feed:', error);
      throw error;
    }
  }

  /**
   * Get feed sources with counts
   * @returns {Array} Feed sources
   */
  async getFeedSources() {
    try {
      // Get count of content from each source
      const sources = await Content.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { source: '$_id', count: 1, _id: 0 } }
      ]);

      return sources;
    } catch (error) {
      logger.error('Error fetching feed sources:', error);
      throw error;
    }
  }

  /**
   * Get available content categories with counts
   * @returns {Array} Categories
   */
  async getContentCategories() {
    try {
      // Get top categories across all content
      const categories = await Content.aggregate([
        { $unwind: '$categories' },
        { $group: { _id: '$categories', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
        { $project: { category: '$_id', count: 1, _id: 0 } }
      ]);

      return categories;
    } catch (error) {
      logger.error('Error fetching content categories:', error);
      throw error;
    }
  }

  /**
   * Save content for a user
   * @param {string} userId - User ID
   * @param {string} contentId - Content ID
   * @param {Object} options - Save options
   * @returns {Object} Saved content
   */
  async saveContent(userId, contentId, options = {}) {
    try {
      const {
        folder = 'General',
        tags = [],
        notes = ''
      } = options;

      // Check if content exists
      const content = await Content.findById(contentId);
      
      if (!content) {
        throw new Error('Content not found');
      }

      // Check if content is already saved
      const existingSaved = await SavedContent.findOne({
        user: userId,
        content: contentId
      });

      if (existingSaved) {
        // Update existing saved content
        existingSaved.folder = folder;
        existingSaved.tags = tags;
        existingSaved.notes = notes;
        await existingSaved.save();

        return {
          message: 'Content updated in saved items',
          savedContent: existingSaved
        };
      }

      // Create new saved content
      const savedContent = new SavedContent({
        user: userId,
        content: contentId,
        folder,
        tags,
        notes
      });

      await savedContent.save();

      // Award credits for saving content
      await CreditService.awardContentInteractionCredits(userId, contentId, 'save');

      return {
        message: 'Content saved successfully',
        savedContent
      };
    } catch (error) {
      logger.error('Error saving content:', error);
      throw error;
    }
  }

  /**
   * Unsave content for a user
   * @param {string} userId - User ID
   * @param {string} contentId - Content ID
   * @returns {Object} Result
   */
  async unsaveContent(userId, contentId) {
    try {
      // Find and delete saved content
      const result = await SavedContent.findOneAndDelete({
        user: userId,
        content: contentId
      });

      if (!result) {
        throw new Error('Saved content not found');
      }

      return {
        message: 'Content removed from saved items'
      };
    } catch (error) {
      logger.error('Error unsaving content:', error);
      throw error;
    }
  }

  /**
   * Get user's saved content
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Saved content
   */
  async getSavedContent(userId, options = {}) {
    try {
      const savedContent = await SavedContent.findByUserWithPagination(userId, options);
      
      // Get total count for pagination
      const query = { user: userId };
      
      if (options.folder) {
        query.folder = options.folder;
      }
      
      if (options.tags && options.tags.length > 0) {
        query.tags = { $in: Array.isArray(options.tags) ? options.tags : [options.tags] };
      }
      
      const total = await SavedContent.countDocuments(query);
      
      return {
        items: savedContent,
        pagination: {
          page: parseInt(options.page || 1),
          limit: parseInt(options.limit || 20),
          total,
          pages: Math.ceil(total / (options.limit || 20))
        }
      };
    } catch (error) {
      logger.error('Error getting saved content:', error);
      throw error;
    }
  }

  /**
   * Get user's saved content folders
   * @param {string} userId - User ID
   * @returns {Array} Folders
   */
  async getSavedContentFolders(userId) {
    try {
      const folders = await SavedContent.getUserFolders(userId);
      
      // Count items in each folder
      const folderCounts = await SavedContent.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$folder', count: { $sum: 1 } } },
        { $project: { folder: '$_id', count: 1, _id: 0 } }
      ]);
      
      // Combine results
      const result = folders.map(folder => {
        const folderInfo = folderCounts.find(f => f.folder === folder) || { count: 0 };
        return {
          name: folder,
          count: folderInfo.count
        };
      });
      
      return result;
    } catch (error) {
      logger.error('Error getting saved content folders:', error);
      throw error;
    }
  }

  /**
   * Report content
   * @param {string} userId - User ID
   * @param {string} contentId - Content ID
   * @param {Object} reportData - Report data
   * @returns {Object} Report result
   */
  async reportContent(userId, contentId, reportData) {
    try {
      // Load Report model on demand to avoid circular dependencies
      const Report = require('../models/report.model');
      
      // Check if content exists
      const content = await Content.findById(contentId);
      
      if (!content) {
        throw new Error('Content not found');
      }
      
      // Check if user has already reported this content
      const existingReport = await Report.findOne({
        reporter: userId,
        content: contentId
      });
      
      if (existingReport) {
        throw new Error('You have already reported this content');
      }
      
      // Create new report
      const report = new Report({
        reporter: userId,
        content: contentId,
        reason: reportData.reason,
        description: reportData.description
      });
      
      await report.save();
      
      return {
        message: 'Content reported successfully',
        report
      };
    } catch (error) {
      logger.error('Error reporting content:', error);
      throw error;
    }
  }

  /**
   * Share content and track sharing
   * @param {string} userId - User ID
   * @param {string} contentId - Content ID
   * @returns {Object} Share result with tracking URL
   */
  async shareContent(userId, contentId) {
    try {
      // Check if content exists
      const content = await Content.findById(contentId);
      
      if (!content) {
        throw new Error('Content not found');
      }
      
      // Generate tracking ID
      const trackingId = this.generateTrackingId(userId, contentId);
      
      // Create share URL with tracking
      const shareUrl = `${process.env.FRONTEND_URL}/shared/${contentId}?ref=${trackingId}`;
      
      // Award credits for sharing content
      await CreditService.awardContentInteractionCredits(userId, contentId, 'share');
      
      return {
        message: 'Content ready to share',
        shareUrl
      };
    } catch (error) {
      logger.error('Error sharing content:', error);
      throw error;
    }
  }

  /**
   * Refresh feed content by fetching new data from sources
   * @param {Array} sources - Sources to refresh
   * @returns {Object} Refresh results
   */
  async refreshFeedContent(sources = ['twitter', 'reddit']) {
    try {
      const results = {
        totalFetched: 0,
        totalSaved: 0,
        sources: {}
      };
      
      // Refresh Twitter content
      if (sources.includes('twitter')) {
        // Popular Twitter accounts for content creators
        const twitterHandles = [
          'MKBHD',
          'iJustine',
          'ThioJoe',
          'UnboxTherapy',
          'LinusTech',
          'Google',
          'Microsoft',
          'Apple',
          'TechCrunch',
          'TheVerge'
        ];
        
        const twitterResult = await TwitterService.fetchAndSaveTweets(
          twitterHandles,
          ['tech', 'gadgets', 'programming', 'ai'],
          { tweetsPerUser: 5, tweetsPerHashtag: 10 }
        );
        
        results.sources.twitter = twitterResult;
        results.totalFetched += twitterResult.fetched;
        results.totalSaved += twitterResult.saved;
      }
      
      // Refresh Reddit content
      if (sources.includes('reddit')) {
        // Popular subreddits for tech and creator content
        const subreddits = [
          'technology',
          'gadgets',
          'programming',
          'webdev',
          'youtubers',
          'videos',
          'apple',
          'android',
          'software',
          'hardware'
        ];
        
        const redditResult = await RedditService.fetchAndSavePosts(
          subreddits,
          { 
            postsPerSubreddit: 5,
            includeTrending: true,
            trendingLimit: 20
          }
        );
        
        results.sources.reddit = redditResult;
        results.totalFetched += redditResult.fetched;
        results.totalSaved += redditResult.saved;
      }
      
      return results;
    } catch (error) {
      logger.error('Error refreshing feed content:', error);
      throw error;
    }
  }

  /**
   * Get user's saved content IDs
   * @param {string} userId - User ID
   * @returns {Array} Saved content IDs
   * @private
   */
  async getUserSavedContentIds(userId) {
    try {
      const savedContent = await SavedContent.find({ user: userId })
        .select('content')
        .lean();
      
      return savedContent.map(item => item.content.toString());
    } catch (error) {
      logger.error('Error getting user saved content IDs:', error);
      return [];
    }
  }

  /**
   * Get enabled sources from user preferences
   * @param {Object} user - User object
   * @returns {Array} Enabled sources
   * @private
   */
  getEnabledSourcesFromPreferences(user) {
    const sources = [];
    
    if (user.preferences?.contentSources?.twitter) {
      sources.push('twitter');
    }
    
    if (user.preferences?.contentSources?.reddit) {
      sources.push('reddit');
    }
    
    if (user.preferences?.contentSources?.linkedin) {
      sources.push('linkedin');
    }
    
    // Default to all sources if none specified
    if (sources.length === 0) {
      return ['twitter', 'reddit'];
    }
    
    return sources;
  }

  /**
   * Generate tracking ID for shared content
   * @param {string} userId - User ID
   * @param {string} contentId - Content ID
   * @returns {string} Tracking ID
   * @private
   */
  generateTrackingId(userId, contentId) {
    const timestamp = Date.now();
    return Buffer.from(`${userId}-${contentId}-${timestamp}`).toString('base64');
  }

  /**
   * Get content by ID
   * @param {string} contentId - Content ID
   * @returns {Object} Content
   */
  async getContentById(contentId) {
    try {
      const content = await Content.findById(contentId);
      
      if (!content) {
        throw new Error('Content not found');
      }
      
      return content;
    } catch (error) {
      logger.error('Error getting content by ID:', error);
      throw error;
    }
  }

  /**
   * Search content
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Search results
   */
  async searchContent(query, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sources = null,
        categories = null,
        sortBy = 'relevance'
      } = options;
      
      // Build search query
      const searchQuery = {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { text: { $regex: query, $options: 'i' } },
          { sourceUsername: { $regex: query, $options: 'i' } },
          { sourceName: { $regex: query, $options: 'i' } },
          { categories: { $in: [new RegExp(query, 'i')] } }
        ],
        isInappropriate: false
      };
      
      // Filter by sources if specified
      if (sources && sources.length > 0) {
        searchQuery.source = { $in: sources };
      }
      
      // Filter by categories if specified
      if (categories && categories.length > 0) {
        searchQuery.categories = { $in: categories };
      }
      
      // Determine sort order
      let sortOptions = {};
      
      switch (sortBy) {
        case 'recent':
          sortOptions = { contentCreatedAt: -1 };
          break;
        case 'popular':
          sortOptions = { 'engagement.totalEngagement': -1 };
          break;
        case 'relevance':
        default:
          // For relevance sorting, we'd ideally use text search with weights
          // This is a simplified version
          sortOptions = { score: { $meta: 'textScore' } };
      }
      
      // Execute search with pagination
      const results = await Content.find(searchQuery)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit);
      
      // Get total count for pagination
      const total = await Content.countDocuments(searchQuery);
      
      return {
        items: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching content:', error);
      throw error;
    }
  }
}

module.exports = new FeedService();