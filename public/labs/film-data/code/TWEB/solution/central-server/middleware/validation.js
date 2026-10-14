/**
 * Validation middleware for request parameters and body.
 * Ensures input data meets requirements before processing.
 */

const { ApiError } = require('./error');

/**
 * Validate film ID parameter.
 * Ensures the ID is a valid number.
 */
function validateFilmId(req, res, next) {
  const { id } = req.params;
  
  if (!id || isNaN(parseInt(id, 10))) {
    return next(new ApiError(400, 'Invalid film ID format'));
  }
  
  next();
}

/**
 * Validate search query parameter.
 * Ensures search term is at least 2 characters.
 */
function validateSearchQuery(req, res, next) {
  const { search, q } = req.query;
  const query = search || q;
  
  if (!query || query.trim().length < 2) {
    return next(new ApiError(400, 'Search query must be at least 2 characters'));
  }
  
  next();
}

/**
 * Validate genre parameter.
 * Ensures genre is provided and non-empty.
 */
function validateGenre(req, res, next) {
  const { genre } = req.params;
  
  if (!genre || genre.trim().length === 0) {
    return next(new ApiError(400, 'Genre parameter is required'));
  }
  
  next();
}

/**
 * Simple email validation.
 * @param {string} email email to validate
 * @returns {boolean} true if email is valid format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = {
  validateFilmId,
  validateSearchQuery,
  validateGenre,
  isValidEmail
};
