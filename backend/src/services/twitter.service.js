const { TwitterApi } = require('twitter-api-v2');
const Content = require('../models/content.model');
const logger = require('../utils/logger');

class TwitterService {
  constructor() {
    this.setupClient();
  }

  /**
   * Setup Twitter API client
   */
  setupClient() {
    try {
      // Create Twitter API client with app-only credentials for higher rate limits
      this.client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET,
        bearerToken: process.env.TWITTER_BEARER_TOKEN
      });

      // Use read-only app client for higher rate limits
      this.readOnlyClient = this.client.readOnly;
      
      logger.info('Twitter API client initialized');
    } catch (error) {
      logger.error('Error initializing Twitter API client:', error);
      throw new Error('Failed to initialize Twitter API client');
    }
  }

  /**
   * Fetch tweets from a list of user handles
   * @param {Array} userHandles - List of Twitter handles
   * @param {number} count - Number of tweets to fetch per user
   * @returns {Array} Normalized tweets
   */
  async fetchTweetsFromUsers(userHandles, count = 10) {
    try {
      const allTweets = [];

      for (const handle of userHandles) {
        try {
          // First, get the user ID from handle
          const user = await this.readOnlyClient.v2.userByUsername(handle);
          
          if (!user.data) {
            logger.warn(`Twitter user not found: ${handle}`);
            continue;
          }

          const userId = user.data.id;

          // Fetch tweets for this user
          const tweets = await this.readOnlyClient.v2.userTimeline(userId, {
            max_results: count,
            "tweet.fields": [
              'created_at',
              'public_metrics',
              'entities',
              'attachments',
              'author_id',
              'text'
            ],
            expansions: [
              'author_id',
              'attachments.media_keys'
            ],
            "user.fields": [
              'name',
              'username',
              'profile_image_url'
            ],
            "media.fields": [
              'url',
              'preview_image_url',
              'type'
            ]
          });

          if (tweets.data) {
            // Normalize tweets and add to collection
            const normalizedTweets = await this.normalizeTweets(tweets);
            allTweets.push(...normalizedTweets);
          }
        } catch (userError) {
          logger.error(`Error fetching tweets for user ${handle}:`, userError);
          // Continue with other users
          continue;
        }
      }

      return allTweets;
    } catch (error) {
      logger.error('Error fetching tweets from users:', error);
      throw error;
    }
  }

  /**
   * Fetch tweets from popular hashtags
   * @param {Array} hashtags - List of hashtags (without #)
   * @param {number} count - Number of tweets to fetch per hashtag
   * @returns {Array} Normalized tweets
   */
  async fetchTweetsFromHashtags(hashtags, count = 20) {
    try {
      const allTweets = [];

      for (const hashtag of hashtags) {
        try {
          // Search for tweets with this hashtag
          const query = `#${hashtag.replace(/^#/, '')}`;
          const tweets = await this.readOnlyClient.v2.search({
            query,
            max_results: count,
            "tweet.fields": [
              'created_at',
              'public_metrics',
              'entities',
              'attachments',
              'author_id',
              'text'
            ],
            expansions: [
              'author_id',
              'attachments.media_keys'
            ],
            "user.fields": [
              'name',
              'username',
              'profile_image_url'
            ],
            "media.fields": [
              'url',
              'preview_image_url',
              'type'
            ]
          });

          if (tweets.data) {
            // Normalize tweets and add to collection
            const normalizedTweets = await this.normalizeTweets(tweets);
            allTweets.push(...normalizedTweets);
          }
        } catch (hashtagError) {
          logger.error(`Error fetching tweets for hashtag ${hashtag}:`, hashtagError);
          // Continue with other hashtags
          continue;
        }
      }

      return allTweets;
    } catch (error) {
      logger.error('Error fetching tweets from hashtags:', error);
      throw error;
    }
  }

  /**
   * Normalize Twitter API response to our content model
   * @param {Object} tweetsResponse - Response from Twitter API
   * @returns {Array} Normalized content objects
   */
  async normalizeTweets(tweetsResponse) {
    try {
      const normalizedTweets = [];

      // Helper function to get user data
      const getUserData = (authorId) => {
        const user = tweetsResponse.includes?.users?.find(u => u.id === authorId);
        return user || null;
      };

      // Helper function to get media data
      const getMediaData = (mediaKeys) => {
        if (!mediaKeys || !tweetsResponse.includes?.media) return [];
        
        return mediaKeys.map(key => {
          return tweetsResponse.includes.media.find(m => m.media_key === key) || null;
        }).filter(m => m !== null);
      };

      // Process each tweet
      if (tweetsResponse.data && Array.isArray(tweetsResponse.data)) {
        for (const tweet of tweetsResponse.data) {
          // Get author data
          const author = getUserData(tweet.author_id);
          
          if (!author) {
            logger.warn(`Author not found for tweet ${tweet.id}`);
            continue;
          }

          // Get media data
          const mediaKeys = tweet.attachments?.media_keys || [];
          const media = getMediaData(mediaKeys);

          // Extract media URLs and types
          const mediaUrls = [];
          const mediaTypes = [];
          
          media.forEach(m => {
            if (m.url || m.preview_image_url) {
              mediaUrls.push(m.url || m.preview_image_url);
              mediaTypes.push(m.type || 'image');
            }
          });

          // Extract hashtags for categories
          const hashtags = tweet.entities?.hashtags?.map(h => h.tag) || [];

          // Create content object
          const contentObj = {
            source: 'twitter',
            sourceId: tweet.id,
            sourceUsername: author.username,
            sourceName: author.name,
            sourceProfileImage: author.profile_image_url,
            contentType: 'tweet',
            text: tweet.text,
            mediaUrls,
            mediaTypes,
            categories: hashtags,
            url: `https://twitter.com/${author.username}/status/${tweet.id}`,
            engagement: {
              likes: tweet.public_metrics?.like_count || 0,
              comments: tweet.public_metrics?.reply_count || 0,
              shares: tweet.public_metrics?.retweet_count || 0,
              totalEngagement: (
                (tweet.public_metrics?.like_count || 0) +
                (tweet.public_metrics?.reply_count || 0) +
                (tweet.public_metrics?.retweet_count || 0)
              )
            },
            contentCreatedAt: new Date(tweet.created_at),
            cacheExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            metadata: {
              quote_count: tweet.public_metrics?.quote_count || 0,
              impression_count: tweet.public_metrics?.impression_count || 0
            }
          };

          normalizedTweets.push(contentObj);
        }
      }

      return normalizedTweets;
    } catch (error) {
      logger.error('Error normalizing tweets:', error);
      throw error;
    }
  }

  /**
   * Save tweets to database
   * @param {Array} tweets - Normalized tweet objects
   * @returns {Array} Saved content documents
   */
  async saveTweetsToDatabase(tweets) {
    try {
      const savedTweets = [];

      for (const tweet of tweets) {
        try {
          // Check if tweet already exists
          let existingTweet = await Content.findOne({
            source: 'twitter',
            sourceId: tweet.sourceId
          });

          if (existingTweet) {
            // Update engagement metrics if tweet exists
            existingTweet = await existingTweet.updateEngagementMetrics(
              tweet.engagement.likes,
              tweet.engagement.comments,
              tweet.engagement.shares
            );
            
            // Refresh cache expiration
            existingTweet = await existingTweet.refreshCache(24);
            
            savedTweets.push(existingTweet);
          } else {
            // Create new tweet document
            const newTweet = new Content(tweet);
            await newTweet.save();
            savedTweets.push(newTweet);
          }
        } catch (tweetError) {
          logger.error(`Error saving tweet ${tweet.sourceId}:`, tweetError);
          // Continue with other tweets
          continue;
        }
      }

      return savedTweets;
    } catch (error) {
      logger.error('Error saving tweets to database:', error);
      throw error;
    }
  }

  /**
   * Fetch and save tweets in a single operation
   * @param {Array} userHandles - List of Twitter handles
   * @param {Array} hashtags - List of hashtags
   * @param {Object} options - Additional options
   * @returns {Object} Fetching and saving results
   */
  async fetchAndSaveTweets(userHandles = [], hashtags = [], options = {}) {
    try {
      const allTweets = [];
      
      // Fetch from user handles
      if (userHandles && userHandles.length > 0) {
        const userTweets = await this.fetchTweetsFromUsers(
          userHandles,
          options.tweetsPerUser || 10
        );
        allTweets.push(...userTweets);
      }
      
      // Fetch from hashtags
      if (hashtags && hashtags.length > 0) {
        const hashtagTweets = await this.fetchTweetsFromHashtags(
          hashtags,
          options.tweetsPerHashtag || 20
        );
        allTweets.push(...hashtagTweets);
      }
      
      // Save to database
      const savedTweets = await this.saveTweetsToDatabase(allTweets);
      
      return {
        fetched: allTweets.length,
        saved: savedTweets.length
      };
    } catch (error) {
      logger.error('Error in fetch and save tweets operation:', error);
      throw error;
    }
  }

  /**
   * Check Twitter API rate limits
   * @returns {Object} Rate limit status
   */
  async checkRateLimits() {
    try {
      const rateLimits = await this.readOnlyClient.v2.rateLimitStatus([
        '/users/by/username/:username',
        '/users/:id/tweets',
        '/tweets/search/recent'
      ]);
      
      return rateLimits;
    } catch (error) {
      logger.error('Error checking rate limits:', error);
      throw error;
    }
  }
}

module.exports = new TwitterService();