/**
 * Error handling utilities for the review server.
 */
const httpStatus = require('http-status');
const config = require('../config/config');

/**
 * Custom error type used across the review server API.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status code
   * @param {string} message error message
   * @param {boolean} [isOperational=true] marks operational errors
   * @param {string} [stack=''] stack trace
   */
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Normalizes unknown errors into {@link ApiError}.
 */
const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || httpStatus[statusCode];
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

/**
 * Final error responder for API requests.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  
  if (config.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }

  res.status(statusCode).send({
    success: false,
    error: {
      code: statusCode,
      message,
      ...(config.env === 'development' && { stack: err.stack })
    }
  });
};

module.exports = {
  ApiError,
  errorConverter,
  errorHandler
};
