/**
 * Mongoose schemas for users, reviews and chat messages.
 */
const mongoose = require('mongoose');

/**
 * User profile schema.
 */
const UserSchema = new mongoose.Schema({
    nickname: String,
    email: String,
    password: String
});

/**
 * Review schema for movie reviews.
 */
const ReviewSchema = new mongoose.Schema({
    rotten_tomatoes_link: String,
    movie_title: String,
    critic_name: String,
    top_critic: Boolean,
    publisher_name: String,
    review_type: String,
    review_date: Date,
    review_content: String
});

/**
 * Chat message schema (placeholder).
 */
const ChatSchema = new mongoose.Schema({

});

module.exports = mongoose.model('User', UserSchema);
module.exports = mongoose.model('Review', ReviewSchema);
module.exports = mongoose.model('Chat', ChatSchema);