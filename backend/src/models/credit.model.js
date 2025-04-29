const mongoose = require('mongoose');

const creditTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['earn', 'spend', 'adjustment'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balance: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: [
      'daily_login',
      'profile_completion',
      'content_interaction',
      'special_event',
      'admin_adjustment',
      'feature_usage',
      'other'
    ],
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create indexes for efficient queries
creditTransactionSchema.index({ user: 1, createdAt: -1 });
creditTransactionSchema.index({ category: 1 });

const creditBalanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    required: true
  },
  totalEarned: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  lastDailyLoginReward: {
    type: Date
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Methods for credit balance manipulation
creditBalanceSchema.methods.addCredits = async function(amount, category, description, metadata = {}) {
  // Update balance
  this.balance += amount;
  this.totalEarned += amount;
  this.lastUpdated = new Date();
  
  // If this is a daily login reward, update the last reward date
  if (category === 'daily_login') {
    this.lastDailyLoginReward = new Date();
  }
  
  await this.save();
  
  // Create transaction record
  const transaction = new CreditTransaction({
    user: this.user,
    type: 'earn',
    amount,
    balance: this.balance,
    category,
    description,
    metadata
  });
  
  return transaction.save();
};

creditBalanceSchema.methods.deductCredits = async function(amount, category, description, metadata = {}) {
  // Check if user has enough credits
  if (this.balance < amount) {
    throw new Error('Insufficient credits');
  }
  
  // Update balance
  this.balance -= amount;
  this.totalSpent += amount;
  this.lastUpdated = new Date();
  await this.save();
  
  // Create transaction record
  const transaction = new CreditTransaction({
    user: this.user,
    type: 'spend',
    amount: -amount, // Negative to represent spending
    balance: this.balance,
    category,
    description,
    metadata
  });
  
  return transaction.save();
};

creditBalanceSchema.methods.adjustCredits = async function(amount, description, metadata = {}) {
  // Update balance
  this.balance += amount;
  if (amount > 0) {
    this.totalEarned += amount;
  } else {
    this.totalSpent += Math.abs(amount);
  }
  this.lastUpdated = new Date();
  await this.save();
  
  // Create transaction record
  const transaction = new CreditTransaction({
    user: this.user,
    type: 'adjustment',
    amount,
    balance: this.balance,
    category: 'admin_adjustment',
    description,
    metadata
  });
  
  return transaction.save();
};

const CreditTransaction = mongoose.model('CreditTransaction', creditTransactionSchema);
const CreditBalance = mongoose.model('CreditBalance', creditBalanceSchema);

module.exports = {
  CreditTransaction,
  CreditBalance
};