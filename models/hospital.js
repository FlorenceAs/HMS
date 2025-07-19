// models/Hospital.js
const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  hospitalId: {
    type: String,
    unique: true,
    required: true,
    uppercase: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  phone: String,
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  registrationNumber: String,
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  licenseExpiryDate: {
    type: Date,
    required: true
  },
  establishedDate: Date,
  hospitalType: {
    type: String,
    enum: ['General', 'Specialty', 'Teaching', 'Private', 'Public'],
    default: 'General'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  settings: {
    timezone: { type: String, default: 'UTC' },
    workingHours: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '18:00' }
    }
  }
}, {
  timestamps: true
});

// Generate unique hospital ID before saving
hospitalSchema.pre('save', async function(next) {
  if (!this.hospitalId) {
    const count = await mongoose.model('Hospital').countDocuments();
    this.hospitalId = `HOSP${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Hospital', hospitalSchema);