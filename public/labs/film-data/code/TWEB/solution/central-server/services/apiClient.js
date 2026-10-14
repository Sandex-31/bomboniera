/**
 * Axios clients configured for downstream services (reviews and film data).
 */
const axios = require('axios');
const { ApiError } = require('../middleware/error');
const config = require('../config/config');

/**
 * Create an Axios instance for a specific service
 * @param {string} baseURL - Base URL of the service
 * @returns {AxiosInstance} Configured Axios instance
 */
const createServiceClient = (baseURL) => {
  const client = axios.create({
    baseURL,
    timeout: 10000, // Aumentato da 2000ms a 10000ms per gestire ricerche con molti risultati
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      // You can add auth headers here if needed
      // config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => {
      console.error(`Request error: ${error.message}`);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response) => response.data,
    (error) => {
      const errorMessage = error.response?.data?.message || error.message;
      const statusCode = error.response?.status || 500;
      
      console.error(`Service error: ${statusCode} - ${errorMessage}`);
      
      return Promise.reject(
        new ApiError(
          statusCode,          errorMessage,
          true, // isOperational
          error.stack
        )
      );
    }
  );

  return client;
};

// Create clients for each service
console.log('Config services:', config.services);
const services = {
  reviews: createServiceClient(config.services.reviews),
  filmData: createServiceClient(config.services.filmData),
};

module.exports = services;
