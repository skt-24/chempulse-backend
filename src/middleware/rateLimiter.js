const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/apiError');

// Rate limiter for sensitive authentication endpoints (signup, login, reset-password)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many authentication attempts. Please try again later.', 'RATE_LIMIT_EXCEEDED'));
  }
});

// Global rate limiter applied across all /api endpoints
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many requests from this IP. Please try again later.', 'RATE_LIMIT_EXCEEDED'));
  }
});

module.exports = {
  authLimiter,
  globalLimiter
};