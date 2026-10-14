/**
 * Central server runtime configuration.
 * Values are sourced from environment variables with sensible defaults.
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  
  // Service endpoints
  services: {
    reviews: process.env.REVIEWS_SERVICE_URL,
    filmData: process.env.FILM_DATA_SERVICE_URL
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  },
  
  // Logging
  logs: process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
};

module.exports = config;
