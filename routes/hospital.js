// routes/hospital.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Hospital = require('../models/hospital');
const Admin = require('../models/admin');
const EmailVerification = require('../models/EmailVerification');
const { sendVerificationEmail } = require('../services/emailService');

const router = express.Router();

// Rate limiting for registration attempts
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many registration attempts, please try again later.' }
});

// Rate limiting for verification attempts
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 verification attempts per windowMs
  message: { error: 'Too many verification attempts, please try again later.' }
});

// Validation middleware
const validateHospitalRegistration = [
  body('hospitalData.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Hospital name must be between 2 and 100 characters'),
  
  body('hospitalData.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid hospital email'),
  
  body('hospitalData.registrationNumber')
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('Registration number must be between 5 and 50 characters'),
  
  body('hospitalData.licenseNumber')
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('License number must be between 5 and 50 characters'),
  
  body('hospitalData.hospitalNumber')
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('Hospital number must be between 5 and 50 characters'),
  
  body('adminData.fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Admin full name must be between 2 and 100 characters'),
  
  body('adminData.jobTitle')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Job title must be between 2 and 100 characters'),
  
  body('adminData.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid admin email'),
  
  body('adminData.password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Generate verification token
const generateVerificationToken = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
};

// POST /api/hospital/register-with-verification
router.post('/register-with-verification', 
  registrationLimiter,
  validateHospitalRegistration,
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

      const { hospitalData, adminData } = req.body;

      // Check if hospital already exists
      const existingHospital = await Hospital.findOne({
        $or: [
          { email: hospitalData.email },
          { registrationNumber: hospitalData.registrationNumber },
          { licenseNumber: hospitalData.licenseNumber },
          { hospitalNumber: hospitalData.hospitalNumber }
        ]
      });

      if (existingHospital) {
        return res.status(409).json({
          error: 'Hospital already exists',
          message: 'A hospital with this email, registration number, license number, or hospital number already exists'
        });
      }

      // Check if admin email already exists
      const existingAdmin = await Admin.findOne({ email: adminData.email });
      if (existingAdmin) {
        return res.status(409).json({
          error: 'Admin email already exists',
          message: 'An admin with this email already exists'
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);

      // Generate hospital ID
      const hospitalCount = await Hospital.countDocuments();
      const hospitalId = `HOSP${String(hospitalCount + 1).padStart(4, '0')}`;

      // Create hospital (but don't verify yet)
      const hospital = new Hospital({
        hospitalId,
        name: hospitalData.name,
        email: hospitalData.email,
        registrationNumber: hospitalData.registrationNumber,
        licenseNumber: hospitalData.licenseNumber,
        hospitalNumber: hospitalData.hospitalNumber,
        isVerified: false,
        status: 'pending'
      });

      // Create admin (but don't activate yet)
      const admin = new Admin({
        hospitalId: hospital._id,
        name: adminData.fullName,
        jobTitle: adminData.jobTitle,
        email: adminData.email,
        password: hashedPassword,
        role: 'admin',
        isActive: false,
        isEmailVerified: false
      });

      // Generate verification token
      const verificationToken = generateVerificationToken();
      const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save verification token
      const emailVerification = new EmailVerification({
        email: adminData.email,
        token: verificationToken,
        type: 'hospital_registration',
        expiresAt: tokenExpiry,
        attempts: 0,
        maxAttempts: 5,
        metadata: {
          hospitalId: hospital._id,
          adminId: admin._id
        }
      });

      // Save all documents
      await hospital.save();
      await admin.save();
      await emailVerification.save();

      // Send verification email
      try {
        await sendVerificationEmail(adminData.email, verificationToken, {
          adminName: adminData.fullName,
          hospitalName: hospitalData.name,
          hospitalId
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Clean up saved records if email fails
        await Hospital.findByIdAndDelete(hospital._id);
        await Admin.findByIdAndDelete(admin._id);
        await EmailVerification.findByIdAndDelete(emailVerification._id);
        
        return res.status(500).json({
          error: 'Email service unavailable',
          message: 'Unable to send verification email. Please try again later.'
        });
      }

      res.status(200).json({
        message: 'Registration initiated successfully',
        data: {
          hospitalId,
          email: adminData.email,
          verificationRequired: true,
          tokenExpiresAt: tokenExpiry
        }
      });

    } catch (error) {
      console.error('Hospital registration error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred during registration'
      });
    }
  }
);

// POST /api/hospital/verify-email
router.post('/verify-email',
  verificationLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('token').isLength({ min: 6, max: 6 }).withMessage('Token must be 6 digits')
  ],
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

      const { email, token } = req.body;

      // Find verification record
      const verification = await EmailVerification.findOne({
        email,
        token,
        type: 'hospital_registration',
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });

      if (!verification) {
        // Check if there's an expired or used token
        const expiredVerification = await EmailVerification.findOne({
          email,
          type: 'hospital_registration'
        });

        if (expiredVerification) {
          if (expiredVerification.isUsed) {
            return res.status(400).json({
              error: 'Token already used',
              message: 'This verification token has already been used'
            });
          }
          if (expiredVerification.expiresAt <= new Date()) {
            return res.status(400).json({
              error: 'Token expired',
              message: 'Verification token has expired. Please request a new one'
            });
          }
        }

        // Increment attempts
        if (expiredVerification) {
          expiredVerification.attempts += 1;
          if (expiredVerification.attempts >= expiredVerification.maxAttempts) {
            expiredVerification.isBlocked = true;
          }
          await expiredVerification.save();
        }

        return res.status(400).json({
          error: 'Invalid token',
          message: 'Invalid or expired verification token'
        });
      }

      // Check if too many attempts
      if (verification.attempts >= verification.maxAttempts) {
        verification.isBlocked = true;
        await verification.save();
        return res.status(429).json({
          error: 'Too many attempts',
          message: 'Too many verification attempts. Please request a new token'
        });
      }

      // Get hospital and admin
      const hospital = await Hospital.findById(verification.metadata.hospitalId);
      const admin = await Admin.findById(verification.metadata.adminId);

      if (!hospital || !admin) {
        return res.status(404).json({
          error: 'Registration not found',
          message: 'Associated hospital or admin record not found'
        });
      }

      // Verify and activate
      hospital.isVerified = true;
      hospital.status = 'active';
      hospital.verifiedAt = new Date();

      admin.isActive = true;
      admin.isEmailVerified = true;
      admin.emailVerifiedAt = new Date();

      verification.isUsed = true;
      verification.usedAt = new Date();

      // Save updates
      await hospital.save();
      await admin.save();
      await verification.save();

      // Generate JWT token
      const jwtToken = jwt.sign(
        {
          adminId: admin._id,
          hospitalId: hospital._id,
          email: admin.email,
          role: admin.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(200).json({
        message: 'Email verified successfully',
        token: jwtToken,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          jobTitle: admin.jobTitle,
          role: admin.role
        },
        hospital: {
          id: hospital._id,
          hospitalId: hospital.hospitalId,
          name: hospital.name,
          email: hospital.email,
          status: hospital.status
        }
      });

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred during verification'
      });
    }
  }
);

// POST /api/hospital/resend-verification
router.post('/resend-verification',
  verificationLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
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

      const { email } = req.body;

      // Find the latest verification record
      const existingVerification = await EmailVerification.findOne({
        email,
        type: 'hospital_registration',
        isUsed: false
      }).sort({ createdAt: -1 });

      if (!existingVerification) {
        return res.status(404).json({
          error: 'Verification not found',
          message: 'No pending verification found for this email'
        });
      }

      // Check if admin is already verified
      const admin = await Admin.findById(existingVerification.metadata.adminId);
      if (admin && admin.isEmailVerified) {
        return res.status(400).json({
          error: 'Already verified',
          message: 'Email is already verified'
        });
      }

      // Generate new token
      const newToken = generateVerificationToken();
      const newExpiry = new Date(Date.now() + 10 * 60 * 1000);

      // Update verification record
      existingVerification.token = newToken;
      existingVerification.expiresAt = newExpiry;
      existingVerification.attempts = 0;
      existingVerification.isBlocked = false;
      await existingVerification.save();

      // Get hospital info for email
      const hospital = await Hospital.findById(existingVerification.metadata.hospitalId);

      // Send new verification email
      await sendVerificationEmail(email, newToken, {
        adminName: admin.name,
        hospitalName: hospital.name,
        hospitalId: hospital.hospitalId
      });

      res.status(200).json({
        message: 'Verification code resent successfully',
        data: {
          email,
          tokenExpiresAt: newExpiry
        }
      });

    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred while resending verification'
      });
    }
  }
);

module.exports = router;