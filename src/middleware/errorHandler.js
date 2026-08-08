const ApiError = require('../utils/apiError');
const env = require('../config/env');

const notFoundHandler = (req, res, next) => {
  const error = new ApiError(
    404,
    `Route not found: ${req.originalUrl}`,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

const errorHandler = (err, req, res, _next) => {
  let error = err;

  // Handle Mongoose CastError (Invalid ObjectId)
  if (err.name === 'CastError') {
    error = new ApiError(400, `Invalid format for field '${err.path}'`, 'INVALID_ID_FORMAT');
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    error = new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', details);
  }

  // Handle MongoDB Duplicate Key Error (Code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = new ApiError(409, `Duplicate value for ${field}`, 'DUPLICATE_KEY_ERROR');
  }

  const statusCode = error.statusCode || 500;
  const isProd = env.NODE_ENV === 'production';

  const errorResponse = {
    success: false,
    error: {
      code: error.errorCode || 'INTERNAL_SERVER_ERROR',
      message: error.isOperational || !isProd ? error.message : 'An unexpected error occurred on the server.'
    }
  };

  if (!isProd && error.stack) {
    errorResponse.error.stack = error.stack;
  }

  if (error.details) {
    errorResponse.error.details = error.details;
  }

  console.error(`[API Error] ${req.method} ${req.originalUrl} - ${statusCode}: ${error.message}`);

  res.status(statusCode).json(errorResponse);
};

module.exports = {
  notFoundHandler,
  errorHandler
};