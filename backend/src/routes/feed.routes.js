const express = require('express');
const { body, query, validationResult } = require('express-validator');
const FeedService = require('../services/feed.service');
const { authenticate, authorizeVerifiedEmail } = require('../middleware/auth.middleware');
const router = express.Router();

// Apply authentication middleware to all feed routes
router.use(authenticate);

/**
 * @route GET /api/feed
 * @desc Get personalized feed for a user
 * @access Private
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page, limit, sources, categories, sortBy, refresh } = req.query;
    
    // Parse array parameters
    const parsedSources = sources ? (Array.isArray(sources) ? sources : sources.split(',')) : null;
    const parsedCategories = categories ? (Array.isArray(categories) ? categories : categories.split(',')) : null;
    
    const feed = await FeedService.getUserFeed(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sources: parsedSources,
      categories: parsedCategories,
      sortBy: sortBy || 'recent',
      isRefresh: refresh === 'true'
    });
    
    res.status(200).json({
      success: true,
      feed: feed.items,
      pagination: feed.pagination
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/feed/sources
 * @desc Get feed sources
 * @access Private
 */
router.get('/sources', async (req, res, next) => {
  try {
    const sources = await FeedService.getFeedSources();
    
    res.status(200).json({
      success: true,
      sources
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/feed/categories
 * @desc Get feed categories
 * @access Private
 */
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await FeedService.getContentCategories();
    
    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/feed/content/:id
 * @desc Get specific content by ID
 * @access Private
 */
router.get('/content/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const content = await FeedService.getContentById(id);
    
    // Check if content is saved by user
    const savedContentIds = await FeedService.getUserSavedContentIds(userId);
    const isSaved = savedContentIds.includes(id);
    
    // Add saved status to content
    const contentWithSavedStatus = {
      ...content.toObject(),
      isSaved
    };
    
    res.status(200).json({
      success: true,
      content: contentWithSavedStatus
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/feed/save
 * @desc Save content for a user
 * @access Private
 */
router.post(
  '/save',
  [
    body('contentId').notEmpty().withMessage('Content ID is required'),
    body('folder').optional().trim(),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
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
      const { contentId, folder, tags, notes } = req.body;
      
      const result = await FeedService.saveContent(userId, contentId, {
        folder,
        tags,
        notes
      });
      
      res.status(200).json({
        success: true,
        message: result.message,
        savedContent: result.savedContent
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/feed/save/:contentId
 * @desc Unsave content for a user
 * @access Private
 */
router.delete('/save/:contentId', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { contentId } = req.params;
    
    const result = await FeedService.unsaveContent(userId, contentId);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/feed/report
 * @desc Report content
 * @access Private
 */
router.post(
  '/report',
  [
    body('contentId').notEmpty().withMessage('Content ID is required'),
    body('reason')
      .notEmpty()
      .withMessage('Reason is required')
      .isIn([
        'inappropriate',
        'offensive',
        'spam',
        'misinformation',
        'copyright',
        'illegal',
        'hate_speech',
        'violence',
        'harassment',
        'other'
      ])
      .withMessage('Invalid reason'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
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
      const { contentId, reason, description } = req.body;
      
      const result = await FeedService.reportContent(userId, contentId, {
        reason,
        description
      });
      
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
 * @route POST /api/feed/share
 * @desc Share content and track sharing
 * @access Private
 */
router.post(
  '/share',
  [
    body('contentId').notEmpty().withMessage('Content ID is required')
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
      const { contentId } = req.body;
      
      const result = await FeedService.shareContent(userId, contentId);
      
      res.status(200).json({
        success: true,
        message: result.message,
        shareUrl: result.shareUrl
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/feed/search
 * @desc Search content
 * @access Private
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q, page, limit, sources, categories, sortBy } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    // Parse array parameters
    const parsedSources = sources ? (Array.isArray(sources) ? sources : sources.split(',')) : null;
    const parsedCategories = categories ? (Array.isArray(categories) ? categories : categories.split(',')) : null;
    
    const results = await FeedService.searchContent(q, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sources: parsedSources,
      categories: parsedCategories,
      sortBy: sortBy || 'relevance'
    });
    
    res.status(200).json({
      success: true,
      results: results.items,
      pagination: results.pagination
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/feed/refresh
 * @desc Manually refresh feed content
 * @access Private (admin only)
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { sources } = req.body;
    
    // Parse sources if provided
    const parsedSources = sources ? (Array.isArray(sources) ? sources : [sources]) : ['twitter', 'reddit'];
    
    const results = await FeedService.refreshFeedContent(parsedSources);
    
    res.status(200).json({
      success: true,
      message: 'Feed content refreshed successfully',
      results
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;