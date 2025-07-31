// /backend/routes/recipeRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getRecipeRecommendations,
  startRecipeChat,
  handleChatMessage,
  getRecipeDetails
} = require('../controllers/recipeController');

// All routes require authentication
router.use(authMiddleware);

// Get recipe recommendations based on inventory
router.get('/recommendations', getRecipeRecommendations);


router.post('/chat', handleChatMessage);



// Start a recipe chat session
router.post('/chat/start', startRecipeChat);

// Handle chat messages
router.post('/chat/message', handleChatMessage);

// Get detailed recipe information
router.get('/details/:recipeName', getRecipeDetails);

module.exports = router;