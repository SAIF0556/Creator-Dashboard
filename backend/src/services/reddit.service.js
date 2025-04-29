const snoowrap = require('snoowrap');
const Content = require('../models/content.model');
const logger = require('../utils/logger');

class RedditService {
  constructor() {
    this.setupClient();
  }

  /**
   * Setup Reddit API client
   */
  setupClient() {
    try {
      this.client = new snoowrap({
        userAgent: process.env.REDDIT_USER_AGENT,
        clientId: process.env.REDDIT_CLIENT_ID,
        clientSecret: process.env.REDDIT_CLIENT_SECRET,
        username: process.env.REDDIT_USERNAME,
        password: process.env.REDDIT_PASSWORD
      });
      
      // Configure request delays to avoid rate limiting
      this.client.config({
        requestDelay: 1000, // 1 second between requests
        continueAfterRatelimitError: true,
        retryErrorCodes: [502, 503, 504, 522]
      });
      
      logger.info('Reddit API client initialized');
    } catch (error) {
      logger.error('Error initializing Reddit API client:', error);
      throw new Error('Failed to initialize Reddit API client');
    }
  }

  /**
   * Fetch posts from subreddits
   * @param {Array} subreddits - List of subreddit names
   * @param {Object} options - Fetch options
   * @returns {Array} Normalized posts
   */
  async fetchSubredditPosts(subreddits, options = {}) {
    try {
      const {
        limit = 25,
        time = 'day',
        sort = 'hot',
        filter = null
      } = options;
      
      const allPosts = [];
      
      for (const subreddit of subreddits) {
        try {
          // Get the subreddit instance
          const subredditInstance = await this.client.getSubreddit(subreddit);
          
          // Get posts based on sort type
          let posts;
          switch (sort) {
            case 'hot':
              posts = await subredditInstance.getHot({ limit });
              break;
            case 'new':
              posts = await subredditInstance.getNew({ limit });
              break;
            case 'top':
              posts = await subredditInstance.getTop({ limit, time });
              break;
            case 'rising':
              posts = await subredditInstance.getRising({ limit });
              break;
            case 'controversial':
              posts = await subredditInstance.getControversial({ limit, time });
              break;
            default:
              posts = await subredditInstance.getHot({ limit });
          }
          
          // Apply content filtering if needed
          let filteredPosts = posts;
          if (filter && typeof filter === 'function') {
            filteredPosts = posts.filter(filter);
          }
          
          // Fetch additional post data as needed (e.g., comments)
          const normalizedPosts = await this.normalizePosts(filteredPosts, subreddit);
          allPosts.push(...normalizedPosts);
        } catch (subredditError) {
          logger.error(`Error fetching posts from subreddit ${subreddit}:`, subredditError);
          // Continue with other subreddits
          continue;
        }
      }
      
      return allPosts;
    } catch (error) {
      logger.error('Error fetching subreddit posts:', error);
      throw error;
    }
  }

  /**
   * Fetch trending posts across multiple subreddits
   * @param {Object} options - Fetch options
   * @returns {Array} Normalized posts
   */
  async fetchTrendingPosts(options = {}) {
    try {
      const {
        limit = 50,
        time = 'day',
        excludedSubreddits = []
      } = options;
      
      // Get trending posts from r/all
      const posts = await this.client.getSubreddit('all').getHot({ limit });
      
      // Filter out excluded subreddits
      const filteredPosts = posts.filter(post => {
        return !excludedSubreddits.includes(post.subreddit.display_name.toLowerCase());
      });
      
      // Normalize posts
      const normalizedPosts = await this.normalizePosts(filteredPosts);
      
      return normalizedPosts;
    } catch (error) {
      logger.error('Error fetching trending posts:', error);
      throw error;
    }
  }

  /**
   * Search for posts on Reddit
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Normalized posts
   */
  async searchPosts(query, options = {}) {
    try {
      const {
        limit = 25,
        time = 'week',
        subreddit = null,
        sort = 'relevance'
      } = options;
      
      let searchResults;
      
      if (subreddit) {
        // Search within a specific subreddit
        const subredditInstance = await this.client.getSubreddit(subreddit);
        searchResults = await subredditInstance.search({
          query,
          limit,
          time,
          sort
        });
      } else {
        // Search across all of Reddit
        searchResults = await this.client.search({
          query,
          limit,
          time,
          sort
        });
      }
      
      // Normalize posts
      const normalizedPosts = await this.normalizePosts(searchResults);
      
      return normalizedPosts;
    } catch (error) {
      logger.error('Error searching Reddit posts:', error);
      throw error;
    }
  }

  /**
   * Normalize Reddit API response to our content model
   * @param {Array} posts - Reddit posts
   * @param {string} subredditName - Optional subreddit name
   * @returns {Array} Normalized content objects
   */
  async normalizePosts(posts, subredditName = null) {
    try {
      const normalizedPosts = [];
      
      for (const post of posts) {
        // Skip deleted posts
        if (post.author.name === '[deleted]') {
          continue;
        }
        
        // Determine content type
        let contentType = 'post';
        if (post.is_self) {
          contentType = 'text';
        } else if (post.is_video) {
          contentType = 'video';
        } else if (post.post_hint === 'image') {
          contentType = 'image';
        } else if (post.post_hint === 'link') {
          contentType = 'link';
        }
        
        // Extract media URLs
        const mediaUrls = [];
        const mediaTypes = [];
        
        if (post.url) {
          // Handling different types of media
          if (post.is_video && post.media && post.media.reddit_video) {
            mediaUrls.push(post.media.reddit_video.fallback_url);
            mediaTypes.push('video');
          } else if (post.post_hint === 'image' || /\.(jpg|jpeg|png|gif)$/i.test(post.url)) {
            mediaUrls.push(post.url);
            mediaTypes.push('image');
          } else if (post.gallery_data && post.media_metadata) {
            // Handle gallery posts
            post.gallery_data.items.forEach(item => {
              const mediaId = item.media_id;
              if (post.media_metadata[mediaId]) {
                const mediaItem = post.media_metadata[mediaId];
                if (mediaItem.s && mediaItem.s.u) {
                  mediaUrls.push(mediaItem.s.u);
                  mediaTypes.push(mediaItem.m.split('/')[0] || 'image');
                }
              }
            });
          }
        }
        
        // Create content object
        const contentObj = {
          source: 'reddit',
          sourceId: post.id,
          sourceUsername: post.author.name,
          sourceName: post.author.name,
          contentType,
          title: post.title,
          text: post.selftext || '',
          mediaUrls,
          mediaTypes,
          categories: [
            post.subreddit.display_name || subredditName || 'reddit',
            ...this.extractCategories(post)
          ],
          url: `https://www.reddit.com${post.permalink}`,
          engagement: {
            likes: post.ups || 0,
            comments: post.num_comments || 0,
            shares: 0, // Reddit doesn't provide shares count
            totalEngagement: (post.ups || 0) + (post.num_comments || 0)
          },
          contentCreatedAt: new Date(post.created_utc * 1000),
          cacheExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          metadata: {
            subreddit: post.subreddit.display_name,
            flair: post.link_flair_text,
            upvoteRatio: post.upvote_ratio,
            domainUrl: post.domain
          }
        };
        
        // Add HTML content if available
        if (post.selftext_html) {
          contentObj.htmlContent = post.selftext_html;
        }
        
        normalizedPosts.push(contentObj);
      }
      
      return normalizedPosts;
    } catch (error) {
      logger.error('Error normalizing Reddit posts:', error);
      throw error;
    }
  }

  /**
   * Extract categories from a Reddit post
   * @param {Object} post - Reddit post
   * @returns {Array} Categories
   * @private
   */
  extractCategories(post) {
    const categories = [];
    
    // Add flair as category if available
    if (post.link_flair_text) {
      categories.push(post.link_flair_text);
    }
    
    // Extract keywords from title
    const titleWords = post.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !['this', 'that', 'what', 'when', 'where', 'which', 'while', 'with'].includes(word));
    
    // Get top 3 most significant words as categories
    titleWords
      .sort((a, b) => b.length - a.length)
      .slice(0, 3)
      .forEach(word => categories.push(word));
    
    return categories;
  }

  /**
   * Save Reddit posts to database
   * @param {Array} posts - Normalized post objects
   * @returns {Array} Saved content documents
   */
  async savePostsToDatabase(posts) {
    try {
      const savedPosts = [];
      
      for (const post of posts) {
        try {
          // Check if post already exists
          let existingPost = await Content.findOne({
            source: 'reddit',
            sourceId: post.sourceId
          });
          
          if (existingPost) {
            // Update engagement metrics if post exists
            existingPost = await existingPost.updateEngagementMetrics(
              post.engagement.likes,
              post.engagement.comments,
              post.engagement.shares
            );
            
            // Refresh cache expiration
            existingPost = await existingPost.refreshCache(24);
            
            savedPosts.push(existingPost);
          } else {
            // Create new post document
            const newPost = new Content(post);
            await newPost.save();
            savedPosts.push(newPost);
          }
        } catch (postError) {
          logger.error(`Error saving Reddit post ${post.sourceId}:`, postError);
          // Continue with other posts
          continue;
        }
      }
      
      return savedPosts;
    } catch (error) {
      logger.error('Error saving Reddit posts to database:', error);
      throw error;
    }
  }

  /**
   * Fetch and save Reddit posts in a single operation
   * @param {Array} subreddits - List of subreddits
   * @param {Object} options - Additional options
   * @returns {Object} Fetching and saving results
   */
  async fetchAndSavePosts(subreddits = [], options = {}) {
    try {
      const allPosts = [];
      
      // Fetch from subreddits
      if (subreddits && subreddits.length > 0) {
        const subredditPosts = await this.fetchSubredditPosts(
          subreddits,
          {
            limit: options.postsPerSubreddit || 25,
            sort: options.sort || 'hot',
            time: options.time || 'day'
          }
        );
        allPosts.push(...subredditPosts);
      }
      
      // Fetch trending posts if requested
      if (options.includeTrending) {
        const trendingPosts = await this.fetchTrendingPosts({
          limit: options.trendingLimit || 50,
          excludedSubreddits: options.excludedSubreddits || []
        });
        allPosts.push(...trendingPosts);
      }
      
      // Save to database
      const savedPosts = await this.savePostsToDatabase(allPosts);
      
      return {
        fetched: allPosts.length,
        saved: savedPosts.length
      };
    } catch (error) {
      logger.error('Error in fetch and save Reddit posts operation:', error);
      throw error;
    }
  }

  /**
   * Get the top 10 most active subreddits
   * @returns {Array} Subreddit names and activity metrics
   */
  async getTopSubreddits() {
    try {
      const popularSubreddits = await this.client.getSubreddits('popular').fetchAll({ limit: 25 });
      
      return popularSubreddits.map(sub => ({
        name: sub.display_name,
        title: sub.title,
        subscribers: sub.subscribers,
        activeUsers: sub.active_user_count,
        description: sub.public_description,
        url: `https://www.reddit.com${sub.url}`
      }));
    } catch (error) {
      logger.error('Error getting top subreddits:', error);
      throw error;
    }
  }

  /**
   * Get information about a specific subreddit
   * @param {string} subredditName - Name of the subreddit
   * @returns {Object} Subreddit information
   */
  async getSubredditInfo(subredditName) {
    try {
      const subreddit = await this.client.getSubreddit(subredditName).fetch();
      
      return {
        name: subreddit.display_name,
        title: subreddit.title,
        description: subreddit.public_description,
        subscribers: subreddit.subscribers,
        activeUsers: subreddit.active_user_count,
        created: new Date(subreddit.created_utc * 1000),
        nsfw: subreddit.over18,
        url: `https://www.reddit.com${subreddit.url}`,
        bannerImage: subreddit.banner_img,
        iconImage: subreddit.icon_img
      };
    } catch (error) {
      logger.error(`Error getting information for subreddit ${subredditName}:`, error);
      throw error;
    }
  }
}

module.exports = new RedditService();