/**
 * Main API router for the central server.
 * Mounts sub-routers for films and reviews.
 * Acts as the gateway coordinator.
 */

const express = require('express');
const router = express.Router();
const { ApiError } = require('../middleware/error');
const http = require('http-status');

// Import sub-routers
const filmRoutes = require('./films');
const reviewRoutes = require('./reviews');

/**
 * Mount sub-routers for different resource types.
 */
router.use('/films', filmRoutes);
router.use('/reviews', reviewRoutes);

/**
 * 404 handler for unmapped API routes.
 */
router.use((req, res, next) => {
  next(new ApiError(http.NOT_FOUND, 'API endpoint not found'));
});

module.exports = router;
