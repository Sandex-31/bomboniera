/**
 * Review service for handling review-related requests.
 * Proxies requests to the review service.
 */

const apiClient = require('./apiClient');

/**
 * Get reviews for a movie by title.
 * @param {string} movieTitle movie title
 * @returns {Promise<Array>} list of reviews
 */
async function getReviewsByMovieTitle(movieTitle) {
  try {
    const reviews = await apiClient.reviews.get(`/api/reviews/movie/${encodeURIComponent(movieTitle)}`);
    return reviews;
  } catch (error) {
    console.error(`Error fetching reviews for "${movieTitle}":`, error.message);
    throw error;
  }
}

module.exports = {
  getReviewsByMovieTitle
};
