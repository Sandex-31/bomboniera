/**
 * Review routes for the API.
 * Handles review-related endpoints.
 */

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

/**
 * @swagger
 * /api/reviews/{movieTitle}:
 *   get:
 *     summary: Get reviews for a movie
 *     tags: [Reviews]
 *     parameters:
 *       - name: movieTitle
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get('/:movieTitle', reviewController.getReviewsByMovieTitle);

module.exports = router;
