const mongoose = require('mongoose');

const savedContentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true
  },
  folder: {
    type: String,
    default: 'General'
  },
  tags: [String],
  notes: {
    type: String
  },
  savedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create a compound index for unique saved content per user
savedContentSchema.index({ user: 1, content: 1 }, { unique: true });

// Create additional indexes for efficient queries
savedContentSchema.index({ user: 1, folder: 1 });
savedContentSchema.index({ user: 1, tags: 1 });
savedContentSchema.index({ user: 1, savedAt: -1 });

// Pre-find middleware to check if the referenced content still exists
savedContentSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'content',
    select: 'source sourceId title text contentType contentCreatedAt url isInappropriate'
  });
  next();
});

// Static method to find user's saved content with pagination
savedContentSchema.statics.findByUserWithPagination = function(userId, options = {}) {
  const {
    folder,
    tags,
    page = 1,
    limit = 20,
    sort = '-savedAt'
  } = options;
  
  const query = { user: userId };
  
  if (folder) {
    query.folder = folder;
  }
  
  if (tags && tags.length > 0) {
    query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
  }
  
  return this.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({
      path: 'content',
      select: 'source sourceId sourceUsername sourceName title text contentType contentCreatedAt url mediaUrls'
    });
};

// Static method to get all folders for a user
savedContentSchema.statics.getUserFolders = function(userId) {
  return this.distinct('folder', { user: userId });
};

// Static method to get all tags for a user
savedContentSchema.statics.getUserTags = function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, tag: '$_id', count: 1 } }
  ]);
};

const SavedContent = mongoose.model('SavedContent', savedContentSchema);

module.exports = SavedContent;