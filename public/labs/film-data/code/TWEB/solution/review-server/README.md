# Review Server - Reviews & Live Chat Service

## Overview

The Review Server is an **Express.js + Socket.io service** that manages movie reviews and real-time chat functionality. It provides a REST API for querying reviews backed by MongoDB, and real-time chat rooms for discussing films using Socket.io.

## Purpose

- **Review Management**: Store and retrieve movie reviews from Rotten Tomatoes data
- **Review Search**: Query reviews by movie title or critic name
- **Real-Time Chat**: Enable live chat discussions between users in film-specific rooms
- **Socket.io Integration**: Provides WebSocket-based communication for real-time interactions

## Architecture

```
Frontend (Central Server)
    ├─ REST API for Reviews (Port 3002)
    └─ WebSocket for Chat (Port 3002)
Review Server
    ↓
MongoDB (Port 27017)
    ├─ reviews collection
    └─ chat_messages collection
```

## API Endpoints

### Reviews REST API

- **GET /api/reviews** - Get all reviews with optional filtering
  - Query params: `movieTitle`, `criticName`
  
- **GET /api/reviews/movie/:movieTitle** - Get reviews for a specific movie
  - Path param: `movieTitle` (required)

### Socket.IO Chat Events

**Client → Server:**
- `join-film-chat` - Join a film chat room
  - Payload: `{ filmId, username }`
- `chat-message` - Send a message
  - Payload: `{ filmId, message }`
- `typing` - User is typing
  - Payload: `{ filmId }`
- `stop-typing` - User stopped typing
  - Payload: `{ filmId }`

**Server → Client:**
- `user-joined` - User joined the chat
- `user-left` - User left the chat
- `chat-message` - New message in chat
- `active-users` - List of users in the chat
- `user-typing` - Someone is typing
- `user-stop-typing` - Someone stopped typing

## Running the Server

### Prerequisites
- Node.js (v14+)
- npm
- MongoDB running on `localhost:27017`

### Installation

```bash
npm install
```

### Configuration

The server uses environment variables from `.env`:
```
NODE_ENV=development
PORT=3002
MONGODB_URL=mongodb://127.0.0.1:27017/UserDB
CORS_ORIGIN=*
```

### Start the Server

```bash
npm start        # Production mode
npm run dev      # Development with auto-reload (nodemon)
```

The server will be available at `http://localhost:3002`

### API Documentation

Swagger documentation available at: `http://localhost:3002/api-docs`

## Database Schema

### Reviews Collection
```javascript
{
  _id: ObjectId,
  rotten_tomatoes_link: String,
  movie_title: String,      // Indexed for fast queries
  critic_name: String,
  top_critic: Boolean,
  publisher_name: String,
  review_type: String,
  review_date: Date,
  review_content: String,
  createdAt: Date
}
```

### Chat Messages Collection
```javascript
{
  _id: ObjectId,
  filmId: String,           // Indexed
  userId: ObjectId,
  username: String,
  message: String,
  timestamp: Date
}
```

## Error Handling

The server uses centralized error handling with the following error types:
- `ApiError` - Custom error class with status codes
- All errors are passed to error middleware for consistent responses
- HTTP status codes follow RESTful conventions

## Middleware

- **CORS** - Cross-origin requests from frontend
- **JSON** - Parse JSON request bodies
- **Validation** - Input validation for movie title
- **Error Handler** - Centralized error responses
- **Swagger** - API documentation

### Start the Server

```bash
npm start
```

Or with auto-reload for development:
```bash
npm run dev
```

The server will start on `http://localhost:3002`

## REST API Endpoints

### Health & Info
- `GET /` - Welcome message

### Users
- `GET /users` - List all users
- `POST /users` - Create a new user
  ```json
  {
    "nickname": "string",
    "email": "string",
    "password": "string"
  }
  ```
- `GET /users/:id` - Get user details by ID
- `PUT /users/:id` - Update user profile
- `DELETE /users/:id` - Delete a user

### Reviews
- `GET /reviews` - List all reviews
- `GET /reviews/:filmId` - Get reviews for a specific film
- `POST /reviews` - Add a new review
  ```json
  {
    "rotten_tomatoes_link": "string",
    "movie_title": "string",
    "critic_name": "string",
    "top_critic": boolean,
    "publisher_name": "string",
    "review_type": "string",
    "review_date": "date",
    "review_content": "string"
  }
  ```
- `PUT /reviews/:id` - Update a review
- `DELETE /reviews/:id` - Delete a review

## Socket.io Events (Real-Time Chat)

### Client → Server

- **`join-film-chat`**: Join a film-specific chat room
  ```javascript
  socket.emit('join-film-chat', {
    filmId: string,
    username: string
  });
  ```

- **`send-message`**: Send a chat message
  ```javascript
  socket.emit('send-message', {
    filmId: string,
    username: string,
    message: string
  });
  ```

- **`disconnect`**: User leaves the chat

### Server → Client

- **`chat-message`**: Receive a message
  ```javascript
  socket.on('chat-message', (data) => {
    // data: { username, message, timestamp, filmId }
  });
  ```

- **`user-joined`**: Someone joined the room
- **`user-left`**: Someone left the room
- **`chat-error`**: Error in chat operation

## API Documentation

Interactive API documentation available at:
```
http://localhost:3002/api-docs
```

## Project Structure

```
review-server/
├── server.js              # Main Express + Socket.io app
├── models/
│   └── User.js           # Mongoose schemas (User, Review, Message)
├── services/
│   └── userService.js    # Data access layer for MongoDB operations
├── package.json          # Dependencies
└── README.md             # This file
```

## Data Models

### User Schema
```javascript
{
  nickname: String,
  email: String,
  password: String,
  createdAt: Date
}
```

### Review Schema
```javascript
{
  rotten_tomatoes_link: String,
  movie_title: String,
  critic_name: String,
  top_critic: Boolean,
  publisher_name: String,
  review_type: String,
  review_date: Date,
  review_content: String,
  createdAt: Date
}
```

### Chat Message Schema (Real-time only)
```javascript
{
  filmId: String,
  username: String,
  message: String,
  timestamp: Date
}
```

## Key Features

1. **User Profiles**: Register and manage user accounts
2. **Review Management**: CRUD operations for movie reviews
3. **Real-Time Chat**: Live discussions using WebSocket connections
4. **Room-Based Chat**: Separate chat rooms for each film/actor
5. **MongoDB Integration**: Fast, scalable document storage
6. **CORS Support**: Allows requests from any origin (configurable)
7. **API Documentation**: Auto-generated Swagger documentation
8. **WebSocket Support**: Bidirectional real-time communication

## Dependencies

- **express**: Web framework
- **mongoose**: MongoDB object modeling
- **socket.io**: Real-time WebSocket library
- **cors**: Cross-Origin Resource Sharing middleware
- **swagger-jsdoc**: Swagger documentation generator
- **swagger-ui-express**: Interactive API documentation UI

## Development

### With Auto-Reload
```bash
npm run dev
```

### Database Operations
All database operations use Mongoose and are async/await based:

```javascript
// Get all users
const users = await userService.getAllUsers();

// Create a user
const user = await userService.createUser({
  nickname: "john_doe",
  email: "john@example.com",
  password: "secret123"
});

// Get user by ID
const user = await userService.getUserById(userId);
```

## Error Handling

The server implements error handling with:
- HTTP status codes (200, 201, 400, 404, 500)
- Detailed error messages
- Try-catch blocks for async operations
- MongoDB connection error handling

## Chat Implementation

Chat is implemented using Socket.io with the following flow:

1. **Connection**: Client connects via WebSocket
2. **Join Room**: Client emits `join-film-chat` with filmId
3. **Message Exchange**: Messages sent/received via `send-message` and `chat-message` events
4. **Room Management**: Socket.io manages room membership
5. **Disconnection**: User automatically leaves room on disconnect

## MongoDB Connection

Ensure MongoDB is running before starting the server:

```bash
# Windows
mongod

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

## Important Notes

- **Database**: Stores all user and review data - ensure MongoDB is backed up
- **Dynamic Data**: Reviews and user data change frequently - not cached
- **Real-Time**: Socket.io connections require WebSocket support in browser
- **CORS**: Currently allows all origins - restrict in production
- **Authentication**: Current implementation stores passwords in plain text - add hashing in production

## Troubleshooting

### MongoDB Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Ensure MongoDB is running on your system

### Socket.io Connection Issues
**Solution**: Check that port 3002 is not blocked by firewall

### CORS Errors
**Solution**: Verify that Central Server is configured with correct Review Service URL

## Support

For issues or questions, refer to:
- API Documentation: `http://localhost:3002/api-docs`
- MongoDB Documentation: https://docs.mongodb.com/
- Socket.io Documentation: https://socket.io/docs/
- Project Report: `../../Report/`
