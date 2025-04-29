const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String
  },
  bio: {
    type: String,
    maxlength: 500
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  preferences: {
    contentSources: {
      twitter: { type: Boolean, default: true },
      reddit: { type: Boolean, default: true },
      linkedin: { type: Boolean, default: false }
    },
    contentCategories: [String],
    emailNotifications: {
      system: { type: Boolean, default: true },
      credits: { type: Boolean, default: true },
      content: { type: Boolean, default: true }
    },
    pushNotifications: {
      system: { type: Boolean, default: true },
      credits: { type: Boolean, default: true },
      content: { type: Boolean, default: true }
    }
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'deactivated'],
    default: 'active'
  },
  profileCompletionPercentage: {
    type: Number,
    default: 0
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

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with the new salt
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to calculate profile completion percentage
userSchema.methods.calculateProfileCompletion = function() {
  const requiredFields = ['firstName', 'lastName', 'profileImage', 'bio'];
  let completedFields = 0;
  
  requiredFields.forEach(field => {
    if (this[field]) completedFields++;
  });
  
  this.profileCompletionPercentage = Math.round((completedFields / requiredFields.length) * 100);
  return this.profileCompletionPercentage;
};

const User = mongoose.model('User', userSchema);

module.exports = User;