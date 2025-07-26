// middleware/auth.js (with debug logging)
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');
const User = require('../models/User');
const Hospital = require('../models/hospital');

// Protect routes - require authentication (your existing function, enhanced)
const protect = async (req, res, next) => {
  try {
    console.log('🔍 [AUTH] Starting authentication...');
    console.log('🔍 [AUTH] Headers:', {
      hasAuth: !!req.headers.authorization,
      authPreview: req.headers.authorization?.substring(0, 30) + '...'
    });

    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('🔍 [AUTH] Token extracted:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
    }

    // Check if token exists
    if (!token) {
      console.log('❌ [AUTH] No token found');
      return res.status(401).json({
        error: 'Not authorized',
        message: 'Access token is required'
      });
    }

    try {
      console.log('🔍 [AUTH] JWT_SECRET exists:', !!process.env.JWT_SECRET);
      console.log('🔍 [AUTH] JWT_SECRET preview:', process.env.JWT_SECRET?.substring(0, 10) + '...');
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ [AUTH] Token verified successfully');
      console.log('🔍 [AUTH] Decoded token:', {
        hasAdminId: !!decoded.adminId,
        hasUserId: !!decoded.userId,
        adminIdPreview: decoded.adminId?.substring(0, 10) + '...',
        email: decoded.email,
        exp: new Date(decoded.exp * 1000).toISOString()
      });
      
      // Check if it's an admin or user token
      if (decoded.adminId) {
        console.log('🔍 [AUTH] Processing admin token...');
        
        // Admin authentication (your existing logic)
        const admin = await Admin.findById(decoded.adminId)
          .populate('hospitalId')
          .select('-password -twoFactorSecret -passwordResetToken');

        console.log('🔍 [AUTH] Admin query result:', {
          adminFound: !!admin,
          adminId: admin?._id?.toString(),
          adminEmail: admin?.email,
          isActive: admin?.isActive,
          isEmailVerified: admin?.isEmailVerified,
          hospitalId: admin?.hospitalId?._id?.toString(),
          hospitalStatus: admin?.hospitalId?.status
        });

        if (!admin) {
          console.log('❌ [AUTH] Admin not found in database');
          return res.status(401).json({
            error: 'Not authorized',
            message: 'Admin account not found'
          });
        }

        // Check if admin is active
        if (!admin.isActive) {
          console.log('❌ [AUTH] Admin is inactive');
          return res.status(401).json({
            error: 'Account inactive',
            message: 'Your account has been deactivated'
          });
        }

        // Check if email is verified
        if (!admin.isEmailVerified) {
          console.log('❌ [AUTH] Admin email not verified');
          return res.status(401).json({
            error: 'Email not verified',
            message: 'Please verify your email address'
          });
        }

        // Check if hospital is active
        if (!admin.hospitalId || admin.hospitalId.status !== 'active') {
          console.log('❌ [AUTH] Hospital inactive or not found');
          console.log('🔍 [AUTH] Hospital details:', {
            hospitalExists: !!admin.hospitalId,
            hospitalStatus: admin.hospitalId?.status
          });
          return res.status(401).json({
            error: 'Hospital inactive',
            message: 'Hospital account is not active'
          });
        }

        console.log('✅ [AUTH] All admin checks passed, setting request objects...');

        // Add admin to request object (your existing pattern)
        req.admin = admin;
        req.hospital = admin.hospitalId;
        req.user = {
          id: admin._id,
          role: 'admin',
          hospitalId: admin.hospitalId._id,
          type: 'admin'
        };

        console.log('✅ [AUTH] Request objects set:', {
          hasAdmin: !!req.admin,
          hasHospital: !!req.hospital,
          hasUser: !!req.user,
          userRole: req.user.role,
          userType: req.user.type
        });

      } else if (decoded.userId) {
        console.log('🔍 [AUTH] Processing user token (staff member)...');
        
        // User authentication (new functionality)
        const user = await User.findById(decoded.userId)
          .populate('hospitalId')
          .select('-password');

        console.log('🔍 [AUTH] User query result:', {
          userFound: !!user,
          userId: user?._id?.toString(),
          userEmail: user?.email,
          isActive: user?.isActive,
          hospitalStatus: user?.hospitalId?.status
        });

        if (!user) {
          console.log('❌ [AUTH] User not found in database');
          return res.status(401).json({
            error: 'Not authorized',
            message: 'User account not found'
          });
        }

        // Check if user is active
        if (!user.isActive) {
          console.log('❌ [AUTH] User is inactive');
          return res.status(401).json({
            error: 'Account inactive',
            message: 'Your account has been deactivated'
          });
        }

        // Check if hospital is active
        if (!user.hospitalId || user.hospitalId.status !== 'active') {
          console.log('❌ [AUTH] User hospital inactive');
          return res.status(401).json({
            error: 'Hospital inactive',
            message: 'Hospital account is not active'
          });
        }

        console.log('✅ [AUTH] User authentication successful');

        // Add user to request object
        req.user = {
          id: user._id,
          role: user.role,
          hospitalId: user.hospitalId._id,
          employeeId: user.employeeId,
          permissions: user.permissions,
          type: 'user'
        };
        req.hospital = user.hospitalId;
        req.staffUser = user; // For user-specific operations

      } else {
        console.log('❌ [AUTH] Invalid token format - no adminId or userId');
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Token format not recognized'
        });
      }

      console.log('✅ [AUTH] Authentication successful, calling next()');
      next();
      
    } catch (error) {
      console.log('❌ [AUTH] Token verification failed:', {
        errorName: error.name,
        errorMessage: error.message,
        tokenPreview: token?.substring(0, 20) + '...'
      });
      
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
    console.error('❌ [AUTH] Middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
};

// Keep all your other middleware functions unchanged...
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Please log in first'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

const adminOnly = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      error: 'Admin access required',
      message: 'This endpoint requires admin authentication'
    });
  }
  next();
};

const userOnly = (req, res, next) => {
  if (!req.staffUser) {
    return res.status(401).json({
      error: 'User access required',
      message: 'This endpoint requires user authentication'
    });
  }
  next();
};

const checkPermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Please log in first'
      });
    }

    if (req.user.type === 'admin') {
      return next();
    }

    if (req.admin && req.admin.role === 'super_admin') {
      return next();
    }

    if (req.admin) {
      const hasPermission = req.admin.permissions.some(permission => 
        permission.module === module && 
        (permission.actions.includes(action) || permission.actions.includes('manage'))
      );

      if (hasPermission) {
        return next();
      }
    }

    if (req.user.permissions) {
      const hasPermission = req.user.permissions.some(permission => 
        permission.module === module && 
        (permission.actions.includes(action) || permission.actions.includes('manage'))
      );

      if (hasPermission) {
        return next();
      }
    }

    return res.status(403).json({
      error: 'Insufficient permissions',
      message: `You don't have permission to ${action} ${module}`
    });
  };
};

const authenticateToken = protect;

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

const requirePermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
    }

    if (req.user.role === 'admin' || req.user.type === 'admin') {
      return next();
    }

    if (!req.user.permissions) {
      return res.status(403).json({
        error: 'No permissions defined',
        message: 'User has no permissions assigned'
      });
    }

    const hasPermission = req.user.permissions.some(permission => 
      permission.module === module && permission.actions.includes(action)
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires ${action} permission for ${module} module`
      });
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.adminId) {
          const admin = await Admin.findById(decoded.adminId)
            .populate('hospitalId')
            .select('-password -twoFactorSecret -passwordResetToken');
            
          if (admin && admin.isActive && admin.isEmailVerified) {
            req.admin = admin;
            req.hospital = admin.hospitalId;
            req.user = {
              id: admin._id,
              role: 'admin',
              hospitalId: admin.hospitalId._id,
              type: 'admin'
            };
          }
        } else if (decoded.userId) {
          const user = await User.findById(decoded.userId)
            .populate('hospitalId')
            .select('-password');
            
          if (user && user.isActive) {
            req.user = {
              id: user._id,
              role: user.role,
              hospitalId: user.hospitalId._id,
              employeeId: user.employeeId,
              permissions: user.permissions,
              type: 'user'
            };
            req.hospital = user.hospitalId;
            req.staffUser = user;
          }
        }
      } catch (error) {
        // Ignore authentication errors for optional auth
      }
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

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
  authLimiter,
  authenticateToken,
  requireRole,
  requirePermission,
  optionalAuth,
  adminOnly,
  userOnly
};