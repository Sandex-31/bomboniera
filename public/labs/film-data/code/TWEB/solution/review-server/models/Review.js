/**
 * Review model schema.
 */
const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  rotten_tomatoes_link: String,
  movie_title: {
    type: String,
    required: true,
    index: true
  },
  critic_name: String,
  top_critic: Boolean,
  publisher_name: String,
  review_type: String,
  review_date: Date,
  review_content: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Review', ReviewSchema);
