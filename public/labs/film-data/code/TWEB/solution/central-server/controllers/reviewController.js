/**
 * Review controller for handling review-related requests.
 * Proxies requests to the review service.
 */

const { ApiError } = require('../middleware/error');
const httpStatus = require('http-status');
const reviewService = require('../services/reviewService');

/**
 * Get reviews for a movie by title.
 * @route GET /api/reviews/:movieTitle
 */
async function getReviewsByMovieTitle(req, res, next) {
  try {
    const { movieTitle } = req.params;
    
    if (!movieTitle || movieTitle.trim().length === 0) {
      return next(new ApiError(httpStatus.BAD_REQUEST, 'Movie title is required'));
    }
    
    const reviews = await reviewService.getReviewsByMovieTitle(movieTitle);
    res.json(reviews);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getReviewsByMovieTitle
};
