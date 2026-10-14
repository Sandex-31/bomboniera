/**
 * Input validation middleware for the review server.
 */
const { ApiError } = require('./error');
const httpStatus = require('http-status');

/**
 * Validates that movie title is provided in search.
 */
const validateMovieTitle = (req, res, next) => {
  const { movieTitle } = req.params;
  
  if (!movieTitle || movieTitle.trim().length === 0) {
    return next(new ApiError(httpStatus.BAD_REQUEST, 'Movie title is required'));
  }
  
  next();
};

module.exports = {
  validateMovieTitle
};
