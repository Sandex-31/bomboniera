/**
 * Film detail page logic, including review display and live chat.
 */

/**
 * Gets the film id from the current URL query string.
 * @returns {string|null} film id
 */
function getFilmIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

/**
 * Loads film details and reviews from the API.
 * @returns {Promise<void>}
 */
async function loadFilmDetails() {
    const filmId = getFilmIdFromURL();
    
    if (!filmId) {
        showError('No film ID provided');
        return;
    }
    
    try {
        const response = await axios.get(`http://localhost:3000/api/films/${filmId}`);
        const filmData = response.data;
        
        console.log('Film data received:', filmData);
        console.log('Reviews in film data:', filmData.reviews);
        
        displayFilmDetails(filmData);
        
        // Load reviews if available
        if (filmData.reviews && filmData.reviews.length > 0) {
            console.log('Displaying', filmData.reviews.length, 'reviews');
            displayReviews(filmData.reviews);
        } else {
            console.log('No reviews found in film data');
        }
    } catch (error) {
        console.error('Error loading film details:', error);
        showError('Failed to load film details. Please try again later.');
    }
}

/**
 * Renders film details into the page.
 * @param {Object} film film payload
 */
function displayFilmDetails(film) {
    document.getElementById('filmTitle').textContent = film.title || 'N/A';
    document.getElementById('filmYear').textContent = film.releaseYear || 'N/A';
    document.getElementById('filmPoster').src = film.poster || 'images/placeholder.jpg';
    document.getElementById('filmPoster').alt = film.title || 'Film Poster';
    
    // Rating
    if (film.rating) {
        document.getElementById('filmRating').textContent = `${film.rating}/5`;
    } else {
        document.getElementById('filmRating').textContent = 'N/A';
    }
    
    // Genres
    if (film.genres && film.genres.length > 0) {
        document.getElementById('filmGenres').innerHTML = film.genres
            .map(genre => `<span class="tag">${genre}</span>`)
            .join('');
    } else {
        document.getElementById('filmGenres').textContent = 'N/A';
    }
    
    // Description
    document.getElementById('filmDescription').textContent = film.description || 'No description available';
    
    // Duration
    if (film.duration) {
        document.getElementById('filmDuration').textContent = `${film.duration} minutes`;
    } else {
        document.getElementById('filmDuration').textContent = 'N/A';
    }
    
    // Hide loading and show content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('filmContent').style.display = 'block';
}

/**
 * Renders review items into the page.
 * @param {Array} reviews review list
 */
function displayReviews(reviews) {
    const reviewsList = document.getElementById('reviewsList');
    const reviewsSection = document.getElementById('reviewsSection');
    const reviewCount = document.getElementById('reviewCount');
    
    if (!reviews || reviews.length === 0) {
        reviewsSection.style.display = 'none';
        return;
    }
    
    if (!reviewsList) {
        return;
    }
    
    reviewsList.innerHTML = '';
    
    // Filter reviews to show only those with review_content not null
    const validReviews = reviews.filter(review => {
        const text = review.review_content || review.text || review.review || review.comment || review.testo || '';
        return text.trim() !== '';
    });
    
    if (validReviews.length === 0) {
        reviewsSection.style.display = 'none';
        return;
    }
    
    // Update count with only valid reviews
    if (reviewCount) reviewCount.textContent = validReviews.length;
    
    // Display first 20 valid reviews
    const reviewsToShow = validReviews.slice(0, 20);
    
    reviewsToShow.forEach((review, index) => {
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        
        const rating = review.review_score || 'N/A';
        const text = review.review_content || '';
        const author = review.critic_name || review.author || 'Anonymous';
        
        // Normalize rating to always show as X/5
        let displayRating = 'N/A';
        if (rating !== 'N/A') {
            // If rating contains a slash, extract the numerator
            if (rating.toString().includes('/')) {
                const ratingValue = rating.toString().split('/')[0];
                displayRating = `${ratingValue}/5`;
            } else {
                displayRating = `${rating}/5`;
            }
        }
        
        reviewItem.innerHTML = `
            <div class="review-rating">Rating: ${displayRating}</div>
            <div class="review-text">${text}</div>
            <small style="color: #999;">${author}</small>
        `;
        reviewsList.appendChild(reviewItem);
    });
    
    // If there are more reviews, show a note
    if (validReviews.length > 20) {
        const moreReviews = document.createElement('div');
        moreReviews.style.marginTop = '20px';
        moreReviews.style.color = '#ffb81c';
        moreReviews.style.textAlign = 'center';
        moreReviews.innerHTML = `<p>... and ${validReviews.length - 20} more reviews</p>`;
        reviewsList.appendChild(moreReviews);
    }
    
    console.log('Setting reviewsSection display to block');
    reviewsSection.style.display = 'block';
    reviewsSection.style.visibility = 'visible';
    reviewsSection.style.opacity = '1';
    reviewsSection.style.height = 'auto';
    reviewsSection.style.maxHeight = 'none';
    reviewsSection.style.overflow = 'visible';
}

/**
 * Shows a user-facing error message.
 * @param {string} message error text
 */
function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').textContent = message;
    document.getElementById('error').style.display = 'block';
}

// ============================================
// CHAT FUNCTIONALITY
// ============================================
let socket = null;
let currentUsername = null;
let currentFilmId = null;
let typingTimeout = null;

/**
 * Initializes chat UI without connecting to socket.
 * Socket connection happens only when user joins.
 */
function initializeChat() {
    currentFilmId = getFilmIdFromURL();
    
    if (!currentFilmId) {
        console.error('No film ID for chat');
        return;
    }
    
    // Set up button listeners (don't connect yet)
    const joinChatBtn = document.getElementById('joinChatBtn');
    if (joinChatBtn) {
        joinChatBtn.addEventListener('click', joinChat);
    }
    
    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinChat();
            }
        });
    }
    
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
    }
    
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        messageInput.addEventListener('input', () => {
            if (socket && currentFilmId) {
                socket.emit('typing', { filmId: currentFilmId });
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    socket.emit('stop-typing', { filmId: currentFilmId });
                }, 1000);
            }
        });
    }
}

/**
 * Connect to Socket.io and set up event listeners.
 * Called only when user joins the chat.
 */
function connectToChat() {
    if (socket && socket.connected) {
        return; // Already connected
    }
    
    socket = io('http://localhost:3002');
    
    socket.on('connect', () => {
        console.log('Connected to chat server');
    });
    
    socket.on('chat-message', (data) => {
        addMessageToChat(data.username, data.message, data.timestamp, false);
    });
    
    socket.on('user-joined', (data) => {
        addSystemMessage(data.message);
    });
    
    socket.on('user-left', (data) => {
        addSystemMessage(data.message);
    });
    
    socket.on('active-users', (users) => {
        updateActiveUsers(users);
    });
    
    socket.on('user-typing', (username) => {
        showTypingIndicator(username);
    });
    
    socket.on('user-stop-typing', () => {
        hideTypingIndicator();
    });
}

/**
 * Joins the current film chat room using the provided username.
 */
function joinChat() {
    const usernameInput = document.getElementById('usernameInput');
    const username = usernameInput.value.trim();
    
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    if (username.length < 2) {
        alert('Username must be at least 2 characters');
        return;
    }
    
    currentUsername = username;
    
    console.log('Joining chat with username:', currentUsername, 'filmId:', currentFilmId);
    
    // Connect to Socket.io now
    connectToChat();
    
    // Join the film-specific chat room
    socket.emit('join-film-chat', {
        filmId: currentFilmId,
        username: currentUsername
    });
    
    // Hide username prompt and show chat interface
    document.getElementById('usernamePrompt').style.display = 'none';
    document.getElementById('chatInterface').style.display = 'block';
    
    // Add welcome message
    addSystemMessage(`Welcome to the chat, ${currentUsername}!`);
}

/**
 * Sends a chat message to the server.
 */
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) {
        return;
    }
    
    // Emit message to server
    socket.emit('chat-message', {
        filmId: currentFilmId,
        message: message
    });
    
    // Clear input
    messageInput.value = '';
    
    // Stop typing indicator
    socket.emit('stop-typing', { filmId: currentFilmId });
}

/**
 * Appends a chat message to the UI.
 * @param {string} username sender name
 * @param {string} message message text
 * @param {string} timestamp display time
 * @param {boolean} [isSystem=false] whether it's a system message
 */
function addMessageToChat(username, message, timestamp, isSystem = false) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = isSystem ? 'chat-message system' : 'chat-message';
    
    if (isSystem) {
        messageDiv.innerHTML = `<div class="message-text">${message}</div>`;
    } else {
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-username">${username}</span>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-text">${escapeHtml(message)}</div>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Adds a system message to the chat.
 * @param {string} message system text
 */
function addSystemMessage(message) {
    addMessageToChat('', message, '', true);
}

/**
 * Updates the active user counter in the chat header.
 * @param {Array} users list of usernames
 */
function updateActiveUsers(users) {
    const count = users.length;
    const text = count === 1 ? '1 user online' : `${count} users online`;
    document.getElementById('activeUsersCount').textContent = text;
    console.log('Updated active users count:', text);
}

/**
 * Shows a typing indicator for the given user.
 * @param {string} username username
 */
function showTypingIndicator(username) {
    const indicator = document.getElementById('typingIndicator');
    indicator.textContent = `${username} is typing...`;
}

/**
 * Clears the typing indicator.
 */
function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    indicator.textContent = '';
}

/**
 * Escapes user input to prevent HTML injection in chat.
 * @param {string} text input text
 * @returns {string} escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Load film details and chat when the page is ready.
 */
document.addEventListener('DOMContentLoaded', () => {
    loadFilmDetails();
    initializeChat();
});
