// routes/userAuth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { protect, userOnly } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: { 
    success: false,
    error: 'Too many login attempts, please try again later.' 
  },
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

// POST /api/auth/login - User login
router.post('/login',
  loginLimiter,
  validateLogin,
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password } = req.body;

      // Find user and populate hospital data
      const user = await User.findOne({ email })
        .populate('hospitalId', 'name hospitalId status isVerified')
        .populate('createdBy', 'name email');

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Account disabled',
          message: 'Your account has been disabled. Please contact your administrator.'
        });
      }

      // Check if hospital is verified and active
      if (!user.hospitalId.isVerified || user.hospitalId.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: 'Hospital inactive',
          message: 'Your hospital account is not active. Please contact support.'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          hospitalId: user.hospitalId._id,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Determine role ID for frontend routing
      const roleMapping = {
        'admin': 0,
        'doctor': 1,
        'nurse': 2,
        'receptionist': 3,
        'lab_technician': 4,
        'pharmacist': 5,
        'accountant': 6
      };

      const roleId = roleMapping[user.role] || 7; // Default to 7 for unknown roles

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            roleId,
            employeeId: user.employeeId,
            department: user.department,
            specialization: user.specialization,
            phone: user.phone,
            permissions: user.permissions,
            lastLogin: user.lastLogin,
            profilePicture: user.profilePicture
          },
          hospital: {
            id: user.hospitalId._id,
            hospitalId: user.hospitalId.hospitalId,
            name: user.hospitalId.name,
            status: user.hospitalId.status
          }
        }
      });

    } catch (error) {
      console.error('User login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred during login'
      });
    }
  }
);

// POST /api/auth/logout - User logout
router.post('/logout',
  protect,
  userOnly,
  (req, res) => {
    // Since we're using stateless JWT, logout is handled client-side
    // by removing the token. This endpoint is for consistency.
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
);

// GET /api/auth/me - Get current user profile
router.get('/me',
  protect,
  userOnly,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id)
        .select('-password')
        .populate('hospitalId', 'name hospitalId status')
        .populate('createdBy', 'name email');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User profile not found'
        });
      }

      const roleMapping = {
        'admin': 0,
        'doctor': 1,
        'nurse': 2,
        'receptionist': 3,
        'lab_technician': 4,
        'pharmacist': 5,
        'accountant': 6
      };

      const roleId = roleMapping[user.role] || 7;

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            roleId,
            employeeId: user.employeeId,
            department: user.department,
            specialization: user.specialization,
            phone: user.phone,
            permissions: user.permissions,
            lastLogin: user.lastLogin,
            profilePicture: user.profilePicture,
            isActive: user.isActive
          },
          hospital: {
            id: user.hospitalId._id,
            hospitalId: user.hospitalId.hospitalId,
            name: user.hospitalId.name,
            status: user.hospitalId.status
          }
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching profile'
      });
    }
  }
);

// PUT /api/auth/profile - Update user profile
router.put('/profile',
  protect,
  userOnly,
  [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Please provide a valid phone number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { firstName, lastName, phone, department, specialization } = req.body;
      const updateData = {};

      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (phone) updateData.phone = phone;
      if (department) updateData.department = department;
      if (specialization) updateData.specialization = specialization;

      const user = await User.findByIdAndUpdate(
        req.user.id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password').populate('hospitalId', 'name hospitalId status');

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
      });

    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while updating profile'
      });
    }
  }
);

// POST /api/auth/change-password - Change password
router.post('/change-password',
  protect,
  userOnly,
  [
    body('currentPassword')
      .isLength({ min: 1 })
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid password',
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while changing password'
      });
    }
  }
);

module.exports = router;