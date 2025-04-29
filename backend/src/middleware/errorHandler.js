const logger = require('../utils/logger');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error(`${err.name}: ${err.message}`, { 
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    user: req.user ? req.user._id : 'unauthenticated'
  });

  // Determine error type and response
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  let errorDetails = null;

  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Validation error';
    errorDetails = Object.values(err.errors).map(e => e.message);
  }
  // Handle mongoose cast errors (e.g. invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    errorMessage = 'Invalid data format';
    errorDetails = err.message;
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorMessage = 'Invalid token';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorMessage = 'Token expired';
  }
  // Handle duplicate key errors
  else if (err.code === 11000) {
    statusCode = 409;
    errorMessage = 'Duplicate entry';
    const field = Object.keys(err.keyValue)[0];
    errorDetails = `${field} already exists`;
  }
  // Handle custom API errors with status code
  else if (err.statusCode) {
    statusCode = err.statusCode;
    errorMessage = err.message;
    errorDetails = err.details;
  }
  // Handle other known errors
  else if (err.message) {
    // Only use the error message directly in non-production environments
    // or if we know it's a safe error to expose
    if (process.env.NODE_ENV !== 'production' || err.isOperational) {
      errorMessage = err.message;
    }
  }

  // Send the error response
  res.status(statusCode).json({
    success: false,
    error: {
      message: errorMessage,
      details: errorDetails,
      // Include the error reference ID for debugging
      reference: req.id
    }
  });
};

module.exports = errorHandler;