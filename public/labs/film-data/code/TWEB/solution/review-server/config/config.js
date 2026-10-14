/**
 * Review server runtime configuration.
 * Values are sourced from environment variables with sensible defaults.
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3002,
  
  // Database connection
  database: {
    url: process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/UserDB'
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  },
  
  // Logging
  logs: process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
};

module.exports = config;
