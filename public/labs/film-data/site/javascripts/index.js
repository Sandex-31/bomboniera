/**
 * Front-end API client and bootstrap logic for the home page.
 */
import axios from 'axios';

/**
 * Axios instance configured for the central API gateway.
 */
const apiClient = axios.create({
    baseURL: 'http://localhost:3000',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    }
});

/**
 * API wrapper for film-related requests.
 */
export const filmApi = {
    /**
     * Get all films with optional query parameters.
     * @param {Object} params query parameters
     * @returns {Promise<Array>} film list
     */
    getFilms: async (params = {}) => {
        try {
            const response = await apiClient.get('/films', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching films:', error);
            throw error;
        }
    },
    /**
     * Get a single film by id.
     * @param {string|number} filmId film identifier
     * @returns {Promise<Object>} film details
     */
    getFilmById: async (filmId) => {
        try {
            const response = await apiClient.get(`/films/${filmId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching film ${filmId}:`, error);
            throw error;
        }
    },
    /**
     * Get reviews for a film.
     * @param {string|number} filmId film identifier
     * @returns {Promise<Array>} review list
     */
    getFilmReviews: async (filmId) => {
        try {
            const response = await apiClient.get(`/films/${filmId}/reviews`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching reviews for film ${filmId}:`, error);
            throw error;
        }
    }
};

/**
 * Initialize the page once the DOM is ready.
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const films = await filmApi.getFilms();
        console.log('Films:', films);
        // Update your UI with the films data
    } catch (error) {
        console.error('Failed to load films:', error);
        // Handle error in UI
    }
});