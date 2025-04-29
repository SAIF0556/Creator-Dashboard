const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true
  },
  reason: {
    type: String,
    enum: [
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
    ],
    required: true
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'accepted', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  actionTaken: {
    type: String,
    enum: ['none', 'removed', 'flagged', 'other'],
    default: 'none'
  },
  reporterNotified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create indexes for efficient queries
reportSchema.index({ status: 1, createdAt: 1 });
reportSchema.index({ reporter: 1 });
reportSchema.index({ content: 1 });
reportSchema.index({ reviewedBy: 1 });

// Pre-find middleware to populate important fields
reportSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'content',
    select: 'source sourceId title text contentType contentCreatedAt url'
  });
  next();
});

// Static method to find reports with pagination
reportSchema.statics.findWithPagination = function(query = {}, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt'
  } = options;
  
  return this.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({
      path: 'reporter',
      select: 'email firstName lastName'
    })
    .populate({
      path: 'reviewedBy',
      select: 'email firstName lastName'
    });
};

// Method to mark report as reviewed
reportSchema.methods.markAsReviewed = function(adminId, status, notes = '', actionTaken = 'none') {
  this.status = status;
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.adminNotes = notes;
  this.actionTaken = actionTaken;
  return this.save();
};

// Method to notify reporter about the review outcome
reportSchema.methods.notifyReporter = function() {
  // This would typically integrate with a notification service
  this.reporterNotified = true;
  return this.save();
};

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;