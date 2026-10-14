/**
 * Review and chat server.
 * Exposes a REST API for users/reviews and a Socket.IO chat per film.
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Import configuration and middleware
const config = require('./config/config');
const apiRoutes = require('./routes/index');
const { errorConverter, errorHandler } = require('./middleware/error');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: config.cors
});

const PORT = config.port;

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Review & Chat Server',
      version: '1.0.0',
      description: 'REST API for user/review data and Socket.IO chat'
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Development server'
      }
    ]
  },
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(cors(config.cors));
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Database connection
mongoose.connect(config.database.url)
  .then(() => console.log('DB connected'))
  .catch(err => console.error('DB connection error:', err));

// API Routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use(errorConverter);
app.use(errorHandler);

// Store active users in each chat room
const chatRooms = new Map();

// Socket.IO chat functionality
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  /**
   * Join a film-specific chat room
   * Payload: { filmId: string|number, username: string }
   */
  socket.on('join-film-chat', ({ filmId, username }) => {
    const roomId = `film-${filmId}`;
    socket.join(roomId);
    socket.username = username;
    socket.currentRoom = roomId;

    // Initialize room if doesn't exist
    if (!chatRooms.has(roomId)) {
      chatRooms.set(roomId, new Set());
    }

    chatRooms.get(roomId).add(username);
    console.log(`${username} joined film chat: ${roomId}`);

    // Notify others in the room
    socket.to(roomId).emit('user-joined', {
      username,
      message: `${username} joined the chat`
    });

    // Send active users list to all in room
    const activeUsers = Array.from(chatRooms.get(roomId));
    io.to(roomId).emit('active-users', activeUsers);
  });

  /**
   * Handle incoming chat messages
   * Payload: { filmId: string|number, message: string }
   */
  socket.on('chat-message', ({ filmId, message }) => {
    const roomId = `film-${filmId}`;
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    io.to(roomId).emit('chat-message', {
      username: socket.username,
      message,
      timestamp
    });
  });

  /**
   * Broadcast typing indicator
   */
  socket.on('typing', ({ filmId }) => {
    const roomId = `film-${filmId}`;
    socket.to(roomId).emit('user-typing', socket.username);
  });

  /**
   * Stop typing indicator
   */
  socket.on('stop-typing', ({ filmId }) => {
    const roomId = `film-${filmId}`;
    socket.to(roomId).emit('user-stop-typing', socket.username);
  });

  socket.on('disconnect', () => {
    if (socket.currentRoom && socket.username) {
      const roomUsers = chatRooms.get(socket.currentRoom);
      if (roomUsers) {
        roomUsers.delete(socket.username);

        socket.to(socket.currentRoom).emit('user-left', {
          username: socket.username,
          message: `${socket.username} left the chat`
        });

        io.to(socket.currentRoom).emit('active-users', Array.from(roomUsers));

        if (roomUsers.size === 0) {
          chatRooms.delete(socket.currentRoom);
        }
      }
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});
