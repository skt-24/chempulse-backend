const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/apiError');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new ApiError(401, 'Authentication token missing', 'UNAUTHORIZED'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new ApiError(401, 'Access token expired', 'TOKEN_EXPIRED'));
      }
      return next(new ApiError(401, 'Invalid access token', 'INVALID_TOKEN'));
    }

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new ApiError(401, 'User belonging to token no longer exists', 'USER_NOT_FOUND'));
    }

    req.user = currentUser;
    next();
  } catch (err) {
    next(err);
  }
};

const optionalProtect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      if (currentUser) {
        req.user = currentUser;
      }
    }
    next();
  } catch (_err) {
    // If token verification fails in optional mode, continue as anonymous user
    next();
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.some((role) => req.user.roles.includes(role))) {
      return next(new ApiError(403, 'Permission denied', 'FORBIDDEN'));
    }
    next();
  };
};

module.exports = { protect, optionalProtect, authorize };