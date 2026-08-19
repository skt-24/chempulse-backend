const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const env = require('./config/env');
const { sendSuccess } = require('./utils/apiResponse');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');
const { mongoSanitize } = require('./middleware/sanitize');

const authRoutes = require('./routes/authRoutes');
const homeRoutes = require('./routes/homeRoutes');
const articleRoutes = require('./routes/articleRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const searchRoutes = require('./routes/searchRoutes');
const moleculeRoutes = require('./routes/moleculeRoutes');
const bookmarkRoutes = require('./routes/bookmarkRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const profileRoutes = require('./routes/profileRoutes');
const quizRoutes = require('./routes/quizRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ingestionRoutes = require('./routes/ingestionRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const vintageRoutes = require('./routes/vintageRoutes');

const app = express();

// Trust Proxy Configuration (for reverse proxies like Nginx/ALB/Cloudflare)
app.set('trust proxy', env.TRUST_PROXY);

// Security Headers & CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Apply Global Rate Limiter across /api routes
app.use('/api', globalLimiter);

// Bounded Request Body Parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Apply NoSQL Input Sanitization
app.use(mongoSanitize);

// Request Logging
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Local Uploads Static Serve (Dev/Test mode only)
if (env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/molecules', moleculeRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/ingestion', ingestionRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/vintage', vintageRoutes);

// --- HEALTH & READINESS PROBES ---

// 1. Liveness Probe (Is server process running?)
app.get('/health/live', (req, res) => {
  sendSuccess(res, 200, { status: 'UP', service: 'ChemPulse API' });
});

// 2. Readiness Probe (Is database connected and ready for traffic?)
app.get('/health/ready', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (isDbConnected) {
    sendSuccess(res, 200, { status: 'READY', dbState: 'Connected' });
  } else {
    res.status(503).json({
      success: false,
      error: { code: 'NOT_READY', message: 'Database connection is not active' }
    });
  }
});


// Unmatched Route Handling
app.use(notFoundHandler);

// Global Error Handling
app.use(errorHandler);

module.exports = app;

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Chemsiq Backend',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});