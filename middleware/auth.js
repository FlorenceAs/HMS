// middleware/auth.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');
const Hospital = require('../models/hospital');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        error: 'Not authorized',
        message: 'Access token is required'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get admin from token
      const admin = await Admin.findById(decoded.adminId)
        .populate('hospitalId')
        .select('-password -twoFactorSecret -passwordResetToken');

      if (!admin) {
        return res.status(401).json({
          error: 'Not authorized',
          message: 'Admin account not found'
        });
      }

      // Check if admin is active
      if (!admin.isActive) {
        return res.status(401).json({
          error: 'Account inactive',
          message: 'Your account has been deactivated'
        });
      }

      // Check if email is verified
      if (!admin.isEmailVerified) {
        return res.status(401).json({
          error: 'Email not verified',
          message: 'Please verify your email address'
        });
      }

      // Check if hospital is active
      if (!admin.hospitalId || admin.hospitalId.status !== 'active') {
        return res.status(401).json({
          error: 'Hospital inactive',
          message: 'Hospital account is not active'
        });
      }

      // Add admin to request object
      req.admin = admin;
      req.hospital = admin.hospitalId;

      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Please log in again'
        });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Please log in again'
        });
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
};

// Authorize roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Please log in first'
      });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

// Check specific permissions
const checkPermission = (module, action) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Please log in first'
      });
    }

    // Super admin has all permissions
    if (req.admin.role === 'super_admin') {
      return next();
    }

    // Check if admin has the specific permission
    const hasPermission = req.admin.permissions.some(permission => 
      permission.module === module && 
      (permission.actions.includes(action) || permission.actions.includes('manage'))
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `You don't have permission to ${action} ${module}`
      });
    }

    next();
  };
};

// Rate limiting for authentication endpoints
const authLimiter = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  protect,
  authorize,
  checkPermission,
  authLimiter
};