/**
 * Film controller for orchestrating film data retrieval and combining with reviews.
 * Handles all film-related API endpoints.
 */

const { ApiError } = require('../middleware/error');
const filmService = require('../services/filmService');

/**
 * Get all films with optional pagination/filters.
 * @route GET /api/films
 */
async function getAllFilms(req, res, next) {
  try {
    const films = await filmService.getAllFilms(req.query);
    res.json(films);
  } catch (error) {
    next(error);
  }
}

/**
 * Get top 10 films by rating.
 * @route GET /api/films/top10
 */
async function getTop10Films(req, res, next) {
  try {
    const films = await filmService.getTop10Films();
    res.json(films);
  } catch (error) {
    next(error);
  }
}

/**
 * Get films by genre.
 * @route GET /api/films/genre/:genre
 */
async function getFilmsByGenre(req, res, next) {
  try {
    const { genre } = req.params;
    
    if (!genre || genre.trim().length === 0) {
      return next(new ApiError(400, 'Genre parameter is required'));
    }
    
    const films = await filmService.getFilmsByGenre(genre);
    res.json(films);
  } catch (error) {
    next(error);
  }
}

/**
 * Search films by title.
 * @route GET /api/films/search
 */
async function searchFilms(req, res, next) {
  try {
    const { search } = req.query;
    
    if (!search || search.trim().length < 2) {
      return next(new ApiError(400, 'Search query must be at least 2 characters'));
    }
    
    const films = await filmService.searchFilms(search);
    res.json(films);
  } catch (error) {
    next(error);
  }
}

/**
 * Get film details by ID, combining film data and reviews.
 * @route GET /api/films/:id
 */
async function getFilmById(req, res, next) {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id, 10))) {
      return next(new ApiError(400, 'Valid film ID is required'));
    }
    
    const filmWithReviews = await filmService.getFilmWithReviews(id);
    
    if (!filmWithReviews) {
      return next(new ApiError(404, 'Film not found'));
    }
    
    res.json(filmWithReviews);
  } catch (error) {
    next(error);
  }
}

/**
 * Health check endpoint.
 * @route GET /api/health
 */
function healthCheck(req, res) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}

module.exports = {
  getAllFilms,
  getTop10Films,
  getFilmsByGenre,
  searchFilms,
  getFilmById,
  healthCheck
};
