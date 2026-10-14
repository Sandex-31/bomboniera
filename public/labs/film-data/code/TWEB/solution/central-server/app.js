/**
 * Central API gateway for the project.
 * Loads environment configuration, mounts API routes and serves the web UI assets.
 */
require('dotenv').config({ path: __dirname + '/.env' });

console.log('Environment variables loaded:');
console.log('REVIEWS_SERVICE_URL:', process.env.REVIEWS_SERVICE_URL);
console.log('FILM_DATA_SERVICE_URL:', process.env.FILM_DATA_SERVICE_URL);

const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const exphbs = require('express-handlebars');
const config = require('./config/config');
const routes = require('./routes');
const { errorHandler } = require('./middleware/error');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();

// Configure Handlebars view engine
app.engine('html', exphbs.engine({ extname: '.html', defaultLayout: false }));
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '../Website/views'));

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Central API Gateway',
      version: '1.0.0',
      description: 'API gateway proxying film data and review services'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ]
  },
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request bodies
app.use(express.static(path.join(__dirname, '../Website/public')));


// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api', routes); // Mount the router at /api

// Page rendering routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/search', async (req, res) => {
    const searchQuery = req.query.q || '';
    
    try {
        let movies = [];
        let movieCount = 0;
        let hasResults = false;
        let errorMessage = '';
        
        if (searchQuery.trim().length >= 3) {
            // Call the API to search for films
            const response = await axios.get(`http://localhost:8081/films/search`, {
                params: { search: searchQuery }
            });
            
            if (response.data && response.data.length > 0) {
                movies = response.data;
                movieCount = movies.length;
                hasResults = true;
            }
        } else if (searchQuery.trim().length > 0 && searchQuery.trim().length < 3) {
            errorMessage = 'Search term must be at least 3 characters';
        }
        
        res.render('search', {
            searchQuery,
            movies,
            movieCount,
            hasResults,
            errorMessage
        });
    } catch (error) {
        console.error('Search error:', error.message);
        res.render('search', {
            searchQuery,
            movies: [],
            movieCount: 0,
            hasResults: false,
            errorMessage: 'Failed to search. Please try again later.'
        });
    }
});

app.get('/film-detail-v2', (req, res) => {
    res.render('film-detail-v2');
});

// Error handling middleware
app.use(errorHandler);

// Start the server
const PORT = config.port || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;