# Central Server - API Gateway & Frontend Server

## Overview

The Central Server is an **Express.js API Gateway** that serves both as an API orchestration layer and the frontend renderer. It acts as the main entry point for the Film Data Web application, serving static HTML pages rendered with Handlebars templates, coordinating communication between the web frontend and backend microservices.

## Purpose

- **Frontend Rendering**: Renders Handlebars templates for dynamic HTML pages (home, search, film details)
- **API Gateway**: Routes API requests to appropriate backend services (Film Data Service & Review Service)
- **Static Assets**: Serves CSS, JavaScript, and images from the Website folder
- **API Documentation**: Provides Swagger/OpenAPI documentation for all endpoints
- **Error Handling**: Centralized error handling and logging for all requests
- **CORS Management**: Handles cross-origin requests from the frontend
- **Fast & Lightweight**: Performs no heavy processing - delegates computation to specialized services

## Architecture

```
Frontend Browser
    ↓ (HTTP requests)
Central Server (Port 3000)
    ├─ Renders Handlebars Templates → Dynamic HTML Pages
    ├─ Serves Static Assets (CSS, JS, images) → from Website/public
    └─ Routes API requests:
        ├→ Film Data Service (Port 8081) - PostgreSQL
        └→ Review Service (Port 3002) - MongoDB + Socket.io Chat
```

## Frontend Pages

The central server renders the following pages using Handlebars templates located in `../Website/views/`:

- **GET /** - Home page with carousel and sliders (`Website/views/index.hbs`)
- **GET /search** - Search results page with movie cards (`Website/views/search.hbs`)
- **GET /film-detail-v2** - Film detail page with reviews and live chat (`Website/views/film-detail-v2.hbs`)

All templates use Handlebars syntax for dynamic content rendering.

## Running the Server

### Prerequisites
- Node.js (v14+)
- npm
- Running instances of:
  - Film Data Service (port 8081)
  - Review Service (port 3002)

### Installation

```bash
npm install
```

### Configuration

Create or update the `.env` file with the following variables:

```dotenv
NODE_ENV=development
PORT=3000
REVIEWS_SERVICE_URL=http://localhost:3002
FILM_DATA_SERVICE_URL=http://localhost:8081
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
CORS_ORIGIN=http://localhost:3000
```

### Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /api/health` - Service health status

### Films
- `GET /api/films` - List all films
- `GET /api/films/top10` - Get top 10 films by rating
- `GET /api/films/genre/:genre` - Films by genre
- `GET /api/films/:id` - Film details with reviews and cast
- `GET /api/films/search` - Search films by title

### Reviews
- `GET /api/reviews/:movieTitle` - Reviews for a movie

### Chat (via Socket.io)
- Connect to Review Service for real-time chat in film-specific rooms

## API Documentation

Interactive API documentation is available at:
```
http://localhost:3000/api-docs
```

This provides a Swagger UI interface for testing all endpoints.

## Project Structure

```
central-server/
├── app.js                 # Main Express application
├── config/
│   └── config.js         # Configuration management
├── middleware/
│   └── error.js          # Error handling middleware
├── routes/
│   └── index.js          # API route definitions
├── services/
│   └── apiClient.js      # HTTP client for backend services
├── package.json          # Dependencies
├── .env                  # Environment variables
└── README.md             # This file
```

## Key Features

1. **Microservices Coordination**: Routes requests to appropriate backend services
2. **Request Proxying**: Forwards client requests to film data and review services
3. **Static Asset Serving**: Delivers the web UI from Website/public
4. **Error Handling**: Graceful error responses with appropriate HTTP status codes
5. **CORS Support**: Enables cross-origin requests from the frontend
6. **API Documentation**: Auto-generated Swagger documentation
7. **Rate Limiting**: Configurable rate limiting to prevent abuse
8. **Logging**: Request/response logging for debugging

## Dependencies

- **express**: Web framework
- **axios**: HTTP client for service-to-service communication
- **cors**: Cross-Origin Resource Sharing middleware
- **dotenv**: Environment variable management
- **swagger-jsdoc**: Swagger documentation generator
- **swagger-ui-express**: Interactive API documentation UI
- **morgan**: HTTP request logger
- **helmet**: Security headers middleware
- **http-status**: HTTP status code utilities

## Error Handling

The server implements centralized error handling with:
- Custom `ApiError` class for consistent error responses
- HTTP status code mapping
- Detailed error messages in development mode
- Production-safe error responses

## Development

For development with auto-reload, install nodemon:

```bash
npm install --save-dev nodemon
npm run dev
```

## Important Notes

- The server must remain lightweight and fast - all heavy processing is delegated to backend services
- Ensure backend services (Film Data & Review Service) are running before starting this server
- Environment variables must be properly configured for service discovery
- CORS is enabled by default for development - restrict in production

## Support

For issues or questions, refer to:
- API Documentation: `http://localhost:3000/api-docs`
- Project Report: `../../Report/`
- Backend Services Documentation: See respective service READMEs
