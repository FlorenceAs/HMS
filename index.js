// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import routes (we'll create these next)
// const authRoutes = require('./routes/auth');
// const hospitalRoutes = require('./routes/hospital');
// const userRoutes = require('./routes/user');

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/hospital', hospitalRoutes);
// app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: 'Connected'
  });
});

// Test route to verify models work
app.get('/api/test', async (req, res) => {
  try {
    const Hospital = require('./models/hospital');
    const User = require('./models/user');
    const Role = require('./models/role');
    
    const hospitalCount = await Hospital.countDocuments();
    const userCount = await User.countDocuments();
    const roleCount = await Role.countDocuments();
    
    res.json({
      message: 'Models are working!',
      counts: {
        hospitals: hospitalCount,
        users: userCount,
        roles: roleCount
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error testing models',
      error: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;