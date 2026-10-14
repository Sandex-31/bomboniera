/**
 * Review controller - handles review-related requests.
 */
const httpStatus = require('http-status');
const { ApiError } = require('../middleware/error');
const reviewService = require('../services/reviewService');

/**
 * Get reviews by movie title.
 */
const getReviewsByMovieTitle = async (req, res, next) => {
  try {
    const { movieTitle } = req.params;
    const reviews = await reviewService.getReviewsByMovieTitle(movieTitle);
    res.json(reviews);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all reviews (with optional filtering).
 */
const getAllReviews = async (req, res, next) => {
  try {
    const { movieTitle, criticName } = req.query;
    let filter = {};
    
    if (movieTitle) {
      filter.movie_title = movieTitle;
    }
    if (criticName) {
      filter.critic_name = criticName;
    }
    
    const reviews = await reviewService.getAllReviews(filter);
    res.json(reviews);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReviewsByMovieTitle,
  getAllReviews
};
