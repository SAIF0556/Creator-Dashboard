const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ['twitter', 'reddit', 'linkedin'],
    required: true
  },
  sourceId: {
    type: String,
    required: true
  },
  sourceUsername: {
    type: String,
    required: true
  },
  sourceName: {
    type: String
  },
  sourceProfileImage: {
    type: String
  },
  contentType: {
    type: String,
    enum: ['post', 'tweet', 'article', 'comment', 'other'],
    required: true
  },
  title: {
    type: String
  },
  text: {
    type: String
  },
  htmlContent: {
    type: String
  },
  mediaUrls: [String],
  mediaTypes: [String],
  categories: [String],
  tags: [String],
  url: {
    type: String
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative', 'unknown'],
    default: 'unknown'
  },
  engagement: {
    likes: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    totalEngagement: {
      type: Number,
      default: 0
    }
  },
  contentCreatedAt: {
    type: Date,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  isInappropriate: {
    type: Boolean,
    default: false
  },
  inappropriateReason: {
    type: String
  },
  cacheExpiration: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  index: { 
    sourceId: 1, 
    source: 1 
  } 
});

// Create a compound index for unique content across sources
contentSchema.index({ sourceId: 1, source: 1 }, { unique: true });

// Create indexes to optimize queries
contentSchema.index({ source: 1, contentCreatedAt: -1 });
contentSchema.index({ categories: 1 });
contentSchema.index({ tags: 1 });
contentSchema.index({ cacheExpiration: 1 });
contentSchema.index({ isInappropriate: 1 });

// Virtual for determining if content is fresh or needs to be refreshed
contentSchema.virtual('isExpired').get(function() {
  return new Date() > this.cacheExpiration;
});

// Static method to find content that needs refreshing
contentSchema.statics.findExpiredContent = function(limit = 100) {
  return this.find({
    cacheExpiration: { $lt: new Date() }
  })
  .sort({ cacheExpiration: 1 })
  .limit(limit);
};

// Method to update engagement metrics
contentSchema.methods.updateEngagementMetrics = function(likes, comments, shares) {
  this.engagement.likes = likes || this.engagement.likes;
  this.engagement.comments = comments || this.engagement.comments;
  this.engagement.shares = shares || this.engagement.shares;
  this.engagement.totalEngagement = this.engagement.likes + this.engagement.comments + this.engagement.shares;
  return this.save();
};

// Method to refresh cache expiration
contentSchema.methods.refreshCache = function(expirationHours = 24) {
  this.cacheExpiration = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  return this.save();
};

const Content = mongoose.model('Content', contentSchema);

module.exports = Content;