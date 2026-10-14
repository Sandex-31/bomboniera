/**
 * Film routes for the API.
 * Handles all film-related endpoints.
 */

const express = require('express');
const router = express.Router();
const filmController = require('../controllers/filmController');
const { validateFilmId, validateSearchQuery, validateGenre } = require('../middleware/validation');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', filmController.healthCheck);

/**
 * @swagger
 * /api/films:
 *   get:
 *     summary: List all films
 *     tags: [Films]
 *     responses:
 *       200:
 *         description: List of films
 */
router.get('/', filmController.getAllFilms);

/**
 * @swagger
 * /api/films/top10:
 *   get:
 *     summary: Get top 10 films
 *     tags: [Films]
 *     responses:
 *       200:
 *         description: Top 10 films with posters
 */
router.get('/top10', filmController.getTop10Films);

/**
 * @swagger
 * /api/films/genre/{genre}:
 *   get:
 *     summary: Get films by genre
 *     tags: [Films]
 *     parameters:
 *       - name: genre
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Films matching the genre
 */
router.get('/genre/:genre', validateGenre, filmController.getFilmsByGenre);

/**
 * @swagger
 * /api/films/search:
 *   get:
 *     summary: Search films by title
 *     tags: [Films]
 *     parameters:
 *       - name: search
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Matching films
 */
router.get('/search', validateSearchQuery, filmController.searchFilms);

/**
 * @swagger
 * /api/films/{id}:
 *   get:
 *     summary: Get film details with reviews
 *     tags: [Films]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Film details including reviews
 */
router.get('/:id', validateFilmId, filmController.getFilmById);

module.exports = router;
