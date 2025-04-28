const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['twitter', 'reddit', 'linkedin'],
    required: true
  },
  sourceId: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  authorUrl: String,
  url: String,
  media: [{
    type: String,
    url: String
  }],
  likes: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  savedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reportedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
postSchema.index({ source: 1, sourceId: 1 }, { unique: true });
postSchema.index({ createdAt: -1 });
postSchema.index({ savedBy: 1 });

module.exports = mongoose.model('Post', postSchema); 