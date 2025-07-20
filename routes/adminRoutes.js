// routes/adminRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Admin = require('../models/admin');
const Hospital = require('../models/hospital');
const { protect, authLimiter } = require('../middleware/auth');

const router = express.Router();

// Login rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware for login
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required')
];

// POST /api/admin/login
router.post('/login', 
  loginLimiter,
  validateLogin,
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Find admin by email and populate hospital
      const admin = await Admin.findOne({ email })
        .populate('hospitalId')
        .select('+password'); // Include password for comparison

      if (!admin) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Invalid email or password'
        });
      }

      // Check if account is locked
      if (admin.isLocked()) {
        const lockTime = Math.ceil((admin.lockUntil - Date.now()) / 1000 / 60);
        return res.status(423).json({
          error: 'Account locked',
          message: `Account is locked. Try again in ${lockTime} minutes.`
        });
      }

      // Check password
      const isPasswordMatch = await bcrypt.compare(password, admin.password);

      if (!isPasswordMatch) {
        // Increment login attempts
        admin.loginAttempts += 1;
        
        // Lock account after max attempts
        const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
        if (admin.loginAttempts >= maxAttempts) {
          const lockTime = process.env.LOCK_TIME || '2h';
          const lockDuration = lockTime.includes('h') 
            ? parseInt(lockTime) * 60 * 60 * 1000 
            : parseInt(lockTime) * 60 * 1000;
          admin.lockUntil = new Date(Date.now() + lockDuration);
        }
        
        await admin.save();
        
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Invalid email or password',
          attemptsRemaining: Math.max(0, maxAttempts - admin.loginAttempts)
        });
      }

      // Check if admin is active
      if (!admin.isActive) {
        return res.status(401).json({
          error: 'Account inactive',
          message: 'Your account has been deactivated. Contact support.'
        });
      }

      // Check if email is verified
      if (!admin.isEmailVerified) {
        return res.status(401).json({
          error: 'Email not verified',
          message: 'Please verify your email address before logging in'
        });
      }

      // Check if hospital is active
      if (!admin.hospitalId || admin.hospitalId.status !== 'active') {
        return res.status(401).json({
          error: 'Hospital inactive',
          message: 'Hospital account is not active. Contact support.'
        });
      }

      // Reset login attempts on successful login
      admin.loginAttempts = 0;
      admin.lockUntil = undefined;
      admin.lastLoginAt = new Date();
      admin.lastLoginIP = clientIP;
      await admin.save();

      // Generate JWT token
      const token = jwt.sign(
        {
          adminId: admin._id,
          hospitalId: admin.hospitalId._id,
          email: admin.email,
          role: admin.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Return success response
      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          initials: admin.name.split(' ').map(n => n[0]).join('').toUpperCase(),
          role: admin.role,
          jobTitle: admin.jobTitle,
          lastLoginAt: admin.lastLoginAt,
          hospital: {
            id: admin.hospitalId._id,
            hospitalId: admin.hospitalId.hospitalId,
            name: admin.hospitalId.name,
            status: admin.hospitalId.status,
            setupStatus: admin.hospitalId.setupStatus
          }
        }
      });

    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred during login'
      });
    }
  }
);

// GET /api/admin/profile
router.get('/profile', protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id)
      .populate('hospitalId')
      .select('-password -twoFactorSecret -passwordResetToken');

    if (!admin) {
      return res.status(404).json({
        error: 'Admin not found',
        message: 'Admin profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          jobTitle: admin.jobTitle,
          role: admin.role,
          isActive: admin.isActive,
          isEmailVerified: admin.isEmailVerified,
          lastLoginAt: admin.lastLoginAt,
          createdAt: admin.createdAt,
          profile: admin.profile,
          permissions: admin.permissions
        },
        hospital: {
          id: admin.hospitalId._id,
          hospitalId: admin.hospitalId.hospitalId,
          name: admin.hospitalId.name,
          email: admin.hospitalId.email,
          status: admin.hospitalId.status,
          isVerified: admin.hospitalId.isVerified,
          subscriptionTier: admin.hospitalId.subscriptionTier,
          features: admin.hospitalId.features,
          setupStatus: admin.hospitalId.setupStatus
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve profile'
    });
  }
});

// PUT /api/admin/profile
router.put('/profile', 
  protect,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('jobTitle')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Job title must be between 2 and 100 characters'),
    body('profile.phone')
      .optional()
      .trim()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Please provide a valid phone number'),
    body('profile.department')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Department must be less than 100 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const allowedUpdates = ['name', 'jobTitle', 'profile'];
      const updates = {};

      // Filter allowed updates
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      // Update admin profile
      const admin = await Admin.findByIdAndUpdate(
        req.admin._id,
        updates,
        { new: true, runValidators: true }
      ).select('-password -twoFactorSecret -passwordResetToken');

      if (!admin) {
        return res.status(404).json({
          error: 'Admin not found',
          message: 'Admin profile not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          jobTitle: admin.jobTitle,
          role: admin.role,
          profile: admin.profile,
          updatedAt: admin.updatedAt
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update profile'
      });
    }
  }
);

// POST /api/admin/change-password
router.post('/change-password',
  protect,
  [
    body('currentPassword')
      .isLength({ min: 1 })
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match new password');
        }
        return true;
      })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Get admin with password
      const admin = await Admin.findById(req.admin._id).select('+password');

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          error: 'Invalid current password',
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      admin.password = hashedNewPassword;
      await admin.save();

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to change password'
      });
    }
  }
);

// POST /api/admin/logout
router.post('/logout', protect, async (req, res) => {
  try {
    // In a more sophisticated setup, you might want to:
    // - Add token to a blacklist
    // - Log the logout event
    // - Clear any session data

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to logout'
    });
  }
});

// GET /api/admin/dashboard-stats
router.get('/dashboard-stats', protect, async (req, res) => {
  try {
    // This is a placeholder for dashboard statistics
    // You can implement actual statistics based on your data models
    
    const stats = {
      hospital: {
        name: req.hospital.name,
        id: req.hospital.hospitalId,
        status: req.hospital.status,
        verifiedAt: req.hospital.verifiedAt,
        setupStatus: req.hospital.setupStatus
      },
      summary: {
        totalStaff: 0, // Implement based on your staff model
        totalPatients: 0, // Implement based on your patient model
        totalAppointments: 0, // Implement based on your appointment model
        revenue: 0 // Implement based on your billing model
      },
      recentActivity: [], // Implement based on your activity log model
      upcomingAppointments: [], // Implement based on your appointment model
      setupRequired: {
        documentsNeeded: !req.hospital.setupStatus.documentsUploaded,
        rolesNeeded: !req.hospital.setupStatus.rolesConfigured,
        setupComplete: req.hospital.setupStatus.currentStep === 'completed'
      }
    };

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve dashboard statistics'
    });
  }
});

module.exports = router;