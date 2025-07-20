// models/Hospital.js
const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  hospitalId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  hospitalNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'inactive'],
    default: 'pending',
    index: true
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  subscriptionTier: {
    type: String,
    enum: ['basic', 'premium', 'enterprise'],
    default: 'basic'
  },
  features: {
    maxUsers: {
      type: Number,
      default: 10
    },
    maxPatients: {
      type: Number,
      default: 1000
    },
    storage: {
      type: Number, // in GB
      default: 5
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  phone: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  specialties: [{
    type: String,
    trim: true
  }],
  bedCount: {
    type: Number,
    min: 0
  },
  settings: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    dateFormat: {
      type: String,
      enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      default: 'DD/MM/YYYY'
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  legalDocuments: [{
    documentType: {
      type: String,
      required: true,
      enum: [
        'business_license',
        'medical_license', 
        'insurance_certificate',
        'accreditation_certificate',
        'tax_certificate',
        'fire_safety_certificate',
        'building_permit',
        'other'
      ]
    },
    documentName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    documentNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    issuingAuthority: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    issueDate: {
      type: Date,
      required: true
    },
    expiryDate: {
      type: Date,
      required: true
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true
    },
    fileName: {
      type: String,
      required: true,
      trim: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'expired'],
      default: 'pending'
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  userRoles: [{
    roleName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    roleCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    department: {
      type: String,
      trim: true,
      maxlength: 100
    },
    level: {
      type: String,
      enum: ['junior', 'senior', 'lead', 'manager', 'director'],
      default: 'junior'
    },
    permissions: [{
      module: {
        type: String,
        required: true,
        enum: [
          'patients',
          'appointments', 
          'medical_records',
          'billing',
          'inventory',
          'staff',
          'reports',
          'settings',
          'dashboard'
        ]
      },
      actions: [{
        type: String,
        enum: ['create', 'read', 'update', 'delete', 'manage', 'approve']
      }]
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
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
  }],
  setupStatus: {
    documentsUploaded: {
      type: Boolean,
      default: false
    },
    rolesConfigured: {
      type: Boolean,
      default: false
    },
    setupCompletedAt: {
      type: Date,
      default: null
    },
    currentStep: {
      type: String,
      enum: ['verified', 'documents', 'roles', 'completed'],
      default: 'verified'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
hospitalSchema.index({ createdAt: -1 });
hospitalSchema.index({ status: 1, isVerified: 1 });

// Virtual for admin count
hospitalSchema.virtual('adminCount', {
  ref: 'Admin',
  localField: '_id',
  foreignField: 'hospitalId',
  count: true
});

module.exports = mongoose.model('Hospital', hospitalSchema);