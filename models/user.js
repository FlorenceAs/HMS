// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist', 'accountant'],
    required: true
  },
  employeeId: String,
  department: String,
  specialization: String, // For doctors
  phone: String,
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: [{
    module: String, // e.g., 'patients', 'appointments', 'billing'
    actions: [String] // e.g., ['read', 'write', 'delete']
  }],
  lastLogin: Date,
  profilePicture: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);