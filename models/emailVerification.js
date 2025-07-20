// models/EmailVerification.js
const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['hospital_registration', 'password_reset', 'email_change'],
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  isUsed: {
    type: Boolean,
    default: false,
    index: true
  },
  usedAt: {
    type: Date,
    default: null
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 5
  },
  isBlocked: {
    type: Boolean,
    default: false,
    index: true
  },
  blockedAt: {
    type: Date,
    default: null
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  metadata: {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital'
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    additionalData: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
emailVerificationSchema.index({ email: 1, type: 1, isUsed: 1 });
emailVerificationSchema.index({ token: 1, type: 1, expiresAt: 1 });
emailVerificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // Auto-delete after 24 hours

// Pre-save middleware to set blocked status
emailVerificationSchema.pre('save', function(next) {
  if (this.attempts >= this.maxAttempts && !this.isBlocked) {
    this.isBlocked = true;
    this.blockedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);