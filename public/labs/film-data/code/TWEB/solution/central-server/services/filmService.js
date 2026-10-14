/**
 * Film service for orchestrating film data retrieval and combining with reviews.
 * Acts as a bridge between controllers and the data/review services.
 */

const apiClient = require('./apiClient');

/**
 * Get all films with optional query parameters.
 * @param {Object} query query parameters
 * @returns {Promise<Array>} film list
 */
async function getAllFilms(query = {}) {
  try {
    const films = await apiClient.filmData.get('/films', { params: query });
    return films;
  } catch (error) {
    console.error('Error fetching all films:', error.message);
    throw error;
  }
}

/**
 * Get top 10 films by rating.
 * @returns {Promise<Array>} top 10 films
 */
async function getTop10Films() {
  try {
    const films = await apiClient.filmData.get('/films/top10');
    return films;
  } catch (error) {
    console.error('Error fetching top 10 films:', error.message);
    throw error;
  }
}

/**
 * Get films by genre.
 * @param {string} genre genre name
 * @returns {Promise<Array>} films in that genre
 */
async function getFilmsByGenre(genre) {
  try {
    const films = await apiClient.filmData.get(`/films/genre/${encodeURIComponent(genre)}`);
    return films;
  } catch (error) {
    console.error(`Error fetching films by genre ${genre}:`, error.message);
    throw error;
  }
}

/**
 * Search films by title.
 * @param {string} searchTerm search term
 * @returns {Promise<Array>} matching films
 */
async function searchFilms(searchTerm) {
  try {
    const films = await apiClient.filmData.get('/films/search', {
      params: { search: searchTerm }
    });
    return films;
  } catch (error) {
    console.error(`Error searching films with term "${searchTerm}":`, error.message);
    throw error;
  }
}

/**
 * Get film details with reviews by combining data from data-server and review-server.
 * @param {string|number} filmId film identifier
 * @returns {Promise<Object>} film data with reviews
 */
async function getFilmWithReviews(filmId) {
  try {
    // Fetch film data from data-server
    let filmData;
    try {
      filmData = await apiClient.filmData.get(`/films/${filmId}`);
    } catch (error) {
      console.warn(`Film ${filmId} not found in data-server:`, error.message);
      filmData = null;
    }

    if (!filmData) {
      return null;
    }

    // Fetch reviews from review-server using film title
    let reviews = [];
    try {
      if (filmData.title) {
        reviews = await apiClient.reviews.get(`/api/reviews/movie/${encodeURIComponent(filmData.title)}`);
      }
    } catch (error) {
      console.warn(`Reviews not found for film "${filmData.title}":`, error.message);
      reviews = [];
    }

    // Combine film data and reviews
    const combinedData = {
      ...filmData,
      reviews: reviews || []
    };

    return combinedData;
  } catch (error) {
    console.error(`Error fetching film ${filmId} with reviews:`, error.message);
    throw error;
  }
}

module.exports = {
  getAllFilms,
  getTop10Films,
  getFilmsByGenre,
  searchFilms,
  getFilmWithReviews
};
