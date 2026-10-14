/**
 * Review routes.
 */
const express = require('express');
const reviewController = require('../controllers/reviewController');
const { validateMovieTitle } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /reviews:
 *   get:
 *     summary: Get all reviews with optional filtering
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: movieTitle
 *         schema:
 *           type: string
 *       - in: query
 *         name: criticName
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get('/', reviewController.getAllReviews);

/**
 * @swagger
 * /reviews/movie/{movieTitle}:
 *   get:
 *     summary: Get reviews by movie title
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: movieTitle
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of reviews for the movie
 *       400:
 *         description: Movie title is required
 */
router.get('/movie/:movieTitle', validateMovieTitle, reviewController.getReviewsByMovieTitle);

module.exports = router;
