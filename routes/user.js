// routes/user.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const Hospital = require("../models/hospital");
const Admin = require("../models/admin");
const { sendUserInvitationEmail } = require("../services/emailService");
const { protect, adminOnly } = require("../middleware/auth"); // Simplified imports

const router = express.Router();

// Rate limiting for user operations
const userOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: { error: "Too many user operations, please try again later." },
});

// Validation middleware for user creation
const validateUserCreation = [
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),

  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("role")
    .isIn([
      "admin",
      "doctor",
      "nurse",
      "receptionist",
      "lab_technician",
      "pharmacist",
      "accountant",
    ])
    .withMessage("Invalid role specified"),

  body("department")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Department must be less than 100 characters"),

  body("specialization")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Specialization must be less than 100 characters"),

  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
];

// Generate temporary password
const generateTemporaryPassword = () => {
  const length = 12;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// Generate employee ID
const generateEmployeeId = async (hospitalId, role) => {
  const rolePrefix = {
    admin: "AD",
    doctor: "DR",
    nurse: "NU",
    receptionist: "RC",
    lab_technician: "LT",
    pharmacist: "PH",
    accountant: "AC",
  };

  const prefix = rolePrefix[role] || "US";
  const userCount = await User.countDocuments({ hospitalId });
  return `${prefix}${String(userCount + 1).padStart(4, "0")}`;
};

// GET /api/users - Get all users for the authenticated admin's hospital
router.get("/", protect, async (req, res) => {
  // Check if user is admin
  if (!req.admin) {
    return res.status(403).json({
      success: false,
      error: "Admin access required",
      message: "This endpoint requires admin authentication",
    });
  }

  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      role = "",
      status = "",
    } = req.query;
    const adminHospitalId = req.hospital._id;

    // Build query
    let query = { hospitalId: adminHospitalId };

    // Add search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
      ];
    }

    // Add role filter
    if (role) {
      query.role = role;
    }

    // Add status filter
    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    // Execute query with pagination
    const users = await User.find(query)
      .select("-password") // Exclude password from response
      .populate("hospitalId", "name hospitalId")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "An unexpected error occurred while fetching users",
    });
  }
});

// POST /api/users - Create new user
router.post(
  "/",
  userOperationsLimiter,
  protect,
  validateUserCreation,
  async (req, res) => {
    // Check if user is admin
    if (!req.admin) {
      return res.status(403).json({
        success: false,
        error: "Admin access required",
        message: "This endpoint requires admin authentication",
      });
    }

    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const {
        firstName,
        lastName,
        email,
        role,
        department,
        specialization,
        phone,
      } = req.body;
      const adminHospitalId = req.hospital._id;
      const createdBy = req.admin._id;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: "User already exists",
          message: "A user with this email already exists",
        });
      }

      // Get hospital details
      const hospital = await Hospital.findById(adminHospitalId);
      if (!hospital) {
        return res.status(404).json({
          success: false,
          error: "Hospital not found",
          message: "Associated hospital not found",
        });
      }

      // Generate temporary password and employee ID
      const temporaryPassword = generateTemporaryPassword();
      const employeeId = await generateEmployeeId(adminHospitalId, role);

      // Create user
      const user = new User({
        firstName,
        lastName,
        email,
        password: temporaryPassword, // Will be hashed by pre-save middleware
        hospitalId: adminHospitalId,
        role,
        employeeId,
        department,
        specialization,
        phone,
        isActive: true,
        createdBy,
      });

      await user.save();

      // Send invitation email
      try {
        await sendUserInvitationEmail(email, temporaryPassword, {
          firstName,
          lastName,
          email: email, // Use the actual email address (not generated)
          hospitalName: hospital.name,
          hospitalId: hospital.hospitalId,
          role,
          employeeId,
          loginUrl: `${process.env.FRONTEND_URL}/user/login`, // Routes to user login page
          isPasswordReset: false,
        });
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        // Delete the user if email fails
        await User.findByIdAndDelete(user._id);

        return res.status(500).json({
          success: false,
          error: "Email service unavailable",
          message: "Unable to send invitation email. Please try again later.",
        });
      }
      // Return user data (without password)
      const userResponse = await User.findById(user._id)
        .select("-password")
        .populate("hospitalId", "name hospitalId");

      res.status(201).json({
        success: true,
        message: "User created successfully and invitation sent",
        data: {
          user: userResponse,
          emailSent: true,
        },
      });
    } catch (error) {
      console.error("User creation error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "An unexpected error occurred during user creation",
      });
    }
  }
);

// PUT /api/users/:id - Update user
router.put(
  "/:id",
  protect,
  [
    body("firstName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("First name must be between 2 and 50 characters"),

    body("lastName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Last name must be between 2 and 50 characters"),

    body("role")
      .optional()
      .isIn([
        "admin",
        "doctor",
        "nurse",
        "receptionist",
        "lab_technician",
        "pharmacist",
        "accountant",
      ])
      .withMessage("Invalid role specified"),

    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
  ],
  async (req, res) => {
    // Check if user is admin
    if (!req.admin) {
      return res.status(403).json({
        success: false,
        error: "Admin access required",
        message: "This endpoint requires admin authentication",
      });
    }

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { id } = req.params;
      const adminHospitalId = req.hospital._id;
      const updateData = req.body;

      // Find user and check hospital ownership
      const user = await User.findOne({
        _id: id,
        hospitalId: adminHospitalId,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
          message: "User not found or not authorized to update",
        });
      }

      // Prevent admins from deactivating themselves if they are also users
      if (updateData.isActive === false && user.email === req.admin.email) {
        return res.status(400).json({
          success: false,
          error: "Cannot deactivate yourself",
          message: "You cannot deactivate your own account",
        });
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      })
        .select("-password")
        .populate("hospitalId", "name hospitalId");

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: { user: updatedUser },
      });
    } catch (error) {
      console.error("User update error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "An unexpected error occurred during user update",
      });
    }
  }
);

// DELETE /api/users/:id - Delete user
router.delete("/:id", protect, async (req, res) => {
  // Check if user is admin
  if (!req.admin) {
    return res.status(403).json({
      success: false,
      error: "Admin access required",
      message: "This endpoint requires admin authentication",
    });
  }

  try {
    const { id } = req.params;
    const adminHospitalId = req.hospital._id;

    // Find user and check hospital ownership
    const user = await User.findOne({
      _id: id,
      hospitalId: adminHospitalId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        message: "User not found or not authorized to delete",
      });
    }

    // Prevent admins from deleting themselves if they are also users
    if (user.email === req.admin.email) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete yourself",
        message: "You cannot delete your own account",
      });
    }

    // Delete user
    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("User deletion error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "An unexpected error occurred during user deletion",
    });
  }
});

// POST /api/users/:id/reset-password - Reset user password
router.post("/:id/reset-password", protect, async (req, res) => {
  // Check if user is admin
  if (!req.admin) {
    return res.status(403).json({
      success: false,
      error: "Admin access required",
      message: "This endpoint requires admin authentication",
    });
  }

  try {
    const { id } = req.params;
    const adminHospitalId = req.hospital._id;

    // Find user and check hospital ownership
    const user = await User.findOne({
      _id: id,
      hospitalId: adminHospitalId,
    }).populate("hospitalId", "name hospitalId");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        message: "User not found or not authorized to reset password",
      });
    }

    // Generate new temporary password
    const newPassword = generateTemporaryPassword();
    user.password = newPassword; // Will be hashed by pre-save middleware
    await user.save();

    // Send password reset email
    try {
      await sendUserInvitationEmail(user.email, newPassword, {
        firstName: user.firstName,
        lastName: user.lastName,
        hospitalName: user.hospitalId.name,
        hospitalId: user.hospitalId.hospitalId,
        role: user.role,
        employeeId: user.employeeId,
        loginUrl: `${process.env.FRONTEND_URL}/login`,
        isPasswordReset: true,
      });
    } catch (emailError) {
      console.error("Password reset email failed:", emailError);
      return res.status(500).json({
        success: false,
        error: "Email service unavailable",
        message: "Password reset but unable to send email notification",
      });
    }

    res.status(200).json({
      success: true,
      message: "Password reset successfully and email sent to user",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "An unexpected error occurred during password reset",
    });
  }
});

// GET /api/users/stats - Get user statistics for dashboard
router.get("/stats", protect, async (req, res) => {
  // Check if user is admin
  if (!req.admin) {
    return res.status(403).json({
      success: false,
      error: "Admin access required",
      message: "This endpoint requires admin authentication",
    });
  }

  try {
    const adminHospitalId = req.hospital._id;

    const stats = await User.aggregate([
      { $match: { hospitalId: adminHospitalId } },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
          },
          inactiveUsers: {
            $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] },
          },
          roleBreakdown: {
            $push: "$role",
          },
        },
      },
      {
        $project: {
          totalUsers: 1,
          activeUsers: 1,
          inactiveUsers: 1,
          roleBreakdown: 1,
        },
      },
    ]);

    // Count users by role
    const roleStats = await User.aggregate([
      { $match: { hospitalId: adminHospitalId } },
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    const roleBreakdown = {};
    roleStats.forEach((stat) => {
      roleBreakdown[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers: stats[0]?.totalUsers || 0,
        activeUsers: stats[0]?.activeUsers || 0,
        inactiveUsers: stats[0]?.inactiveUsers || 0,
        roleBreakdown,
      },
    });
  } catch (error) {
    console.error("User stats error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "An unexpected error occurred while fetching user statistics",
    });
  }
});

module.exports = router;
