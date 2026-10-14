/**
 * Main routes index.
 */
const express = require('express');
const httpStatus = require('http-status');
const { ApiError } = require('../middleware/error');
const reviewRoutes = require('./reviews');

const router = express.Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: Service info
 *     tags: [Info]
 *     responses:
 *       200:
 *         description: Welcome message
 */
router.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Review Data API' });
});

router.use('/reviews', reviewRoutes);

/**
 * 404 handler for unmapped API routes.
 */
router.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'API endpoint not found'));
});

module.exports = router;
