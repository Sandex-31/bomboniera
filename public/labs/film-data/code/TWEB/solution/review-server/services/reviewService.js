/**
 * Review data access layer backed by MongoDB.
 */
const Review = require('../models/Review');

/**
 * Retrieves reviews for a given movie title.
 * @param {string} movieTitle movie title
 * @returns {Promise<Array>} list of reviews
 */
const getReviewsByMovieTitle = async (movieTitle) => {
  const reviews = await Review.find({ movie_title: movieTitle });
  return reviews;
};

/**
 * Retrieves all reviews with optional filtering.
 * @param {Object} filter filter criteria
 * @returns {Promise<Array>} list of reviews
 */
const getAllReviews = async (filter = {}) => {
  return await Review.find(filter);
};

module.exports = {
  getReviewsByMovieTitle,
  getAllReviews
};
