// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const fileUpload = require('express-fileupload');

// Import routes
const hospitalRoutes = require('./routes/hospital');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/user');
const userAuthRoutes = require('./routes/userAuth');
// const hospitalSetupRoutes = require('./routes/hospitalSetup');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { testEmailConfig } = require('./services/emailService');

const app = express();

// Trust proxy for accurate IP addresses behind reverse proxy
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'https://dovacare.vercel.app' // Add your production domain
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// File upload middleware
app.use(fileUpload({
  limits: { fileSize: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024 }, // 10MB
  abortOnLimit: true,
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use('/api/hospital', hospitalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);          
app.use('/api/users', userRoutes);          
app.use('/api/auth', userAuthRoutes);  

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'DovaCare API Server',
    version: '1.0.0',
    status: 'Running',
    docs: '/api/docs',
    health: '/health'
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: {
      hospital: [
        'POST /api/hospital/register-with-verification',
        'POST /api/hospital/verify-email',
        'POST /api/hospital/resend-verification'
      ],
      admin: [
        'POST /api/admin/login',
        'POST /api/admin/logout',
        'GET /api/admin/profile',
        'PUT /api/admin/profile',
        'POST /api/admin/change-password',
        'GET /api/admin/dashboard-stats'
      ],
      users: [
        'GET /api/users',
        'POST /api/users',
        'PUT /api/users/:id',
        'DELETE /api/users/:id',
        'POST /api/users/:id/reset-password',
        'GET /api/users/stats'
      ],
      auth: [
        'POST /api/auth/login',
        'POST /api/auth/logout',
        'GET /api/auth/me',
        'PUT /api/auth/profile',
        'POST /api/auth/change-password'
      ],
      hospitalSetup: [
        'GET /api/hospital-setup/status',
        'GET /api/hospital-setup/documents',
        'POST /api/hospital-setup/documents',
        'GET /api/hospital-setup/roles',
        'POST /api/hospital-setup/roles',
        'POST /api/hospital-setup/complete'
      ]
    }
  });
});

// Global error handler
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Test email configuration on startup
    const emailConfigValid = await testEmailConfig();
    if (emailConfigValid) {
      console.log('✅ Email service configured successfully');
    } else {
      console.log('⚠️  Email service configuration needs attention');
    }

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('\n🔄 Received shutdown signal, closing server gracefully...');
  
  mongoose.connection.close(() => {
    console.log('📄 MongoDB connection closed');
    process.exit(0);
  });
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  console.log('🔄 Shutting down server due to unhandled promise rejection');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.log('🔄 Shutting down server due to uncaught exception');
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`📧 Email service: ${process.env.SMTP_USER}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Admin login: http://localhost:${PORT}/api/admin/login`);
      console.log(`👥 User login: http://localhost:${PORT}/api/auth/login`);
      console.log(`👤 User management: http://localhost:${PORT}/api/users`);
    });

    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', err.message);
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;