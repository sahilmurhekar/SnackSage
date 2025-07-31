// /backend/controllers/recipeController.js
const GeminiService = require('../services/geminiService');
const Item = require('../models/Item');
const User = require('../models/User');

const geminiService = new GeminiService();

// Get recipe recommendations based on user's inventory
exports.getRecipeRecommendations = async (req, res) => {

  console.log('🔥 /recommendations route HIT');

  try {
    const userId = req.user.userId;
    console.log('🔍 Fetching recommendations for user:', userId);

    // Fetch user's inventory
    const inventory = await Item.find({ 
      userId, 
      isUsed: false 
    }).sort({ expirationDate: 1 });

    console.log('📦 Inventory found:', inventory.length, 'items');
    console.log('📋 Inventory items:', inventory.map(item => ({ name: item.name, category: item.category })));
    console.log('🧪 Inventory snapshot:', inventory.map(i => ({
  name: i.name,
  isUsed: i.isUsed,
  expirationDate: i.expirationDate,
  category: i.category
})));

    if (inventory.length === 0) {
      console.log('❌ No inventory items found');
      return res.json({ 
        recommendations: [],
        message: 'Add some items to your inventory to get recipe recommendations!' 
      });
    }

    // Group inventory by category for better organization
    const groupedInventory = inventory.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});

    console.log('🗂️ Grouped inventory:', Object.keys(groupedInventory));

    // Get user preferences
    const user = await User.findOne({ userId });
    const userPreferences = user?.preferences || {};
    console.log('👤 User preferences:', userPreferences);

    // Generate recipe recommendations using Gemini
    console.log('🤖 Calling Gemini service...');
    const recommendations = await geminiService.generateRecipeRecommendations(
      groupedInventory, 
      userPreferences
    );

    console.log('📝 Raw recommendations received:', recommendations?.length || 0);

    // Check if recommendations is valid
    if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
      console.log('⚠️ No valid recommendations received from Gemini');
      return res.json({ 
        recommendations: [],
        message: 'Unable to generate recipe recommendations at the moment. Please try again later.',
        totalInventoryItems: inventory.length,
        debug: {
          inventoryCount: inventory.length,
          hasGeminiResponse: !!recommendations,
          isArray: Array.isArray(recommendations),
          recommendationCount: recommendations?.length || 0
        }
      });
    }

    // Add available ingredients info to each recipe
    const enhancedRecommendations = recommendations.map(recipe => {
      const availableIngredients = recipe.mainIngredients.filter(ingredient => {
        return inventory.some(item => 
          item.name.toLowerCase().includes(ingredient.toLowerCase()) ||
          ingredient.toLowerCase().includes(item.name.toLowerCase())
        );
      });

      return {
        ...recipe,
        availableIngredients,
        missingIngredients: recipe.mainIngredients.filter(ingredient => 
          !availableIngredients.includes(ingredient)
        )
      };
    });

    console.log('✅ Enhanced recommendations:', enhancedRecommendations.length);

    res.json({ 
      recommendations: enhancedRecommendations,
      totalInventoryItems: inventory.length 
    });

  } catch (error) {
    console.error('💥 Get recipe recommendations error:', error);
    console.error('📍 Error stack:', error.stack);
    
    res.status(500).json({ 
      message: 'Failed to get recipe recommendations',
      error: error.message,
      debug: {
        errorType: error.constructor.name,
        errorMessage: error.message
      }
    });
  }
};

// Start a chat session for a specific recipe
exports.startRecipeChat = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { recipeName } = req.body;

    if (!recipeName) {
      return res.status(400).json({ message: 'Recipe name is required' });
    }

    // Get user's current inventory
    const inventory = await Item.find({ 
      userId, 
      isUsed: false 
    });

    const availableIngredients = inventory.map(item => item.name);

    // Generate initial recipe instructions
    const response = await geminiService.generateRecipeInstructions(
      recipeName,
      availableIngredients
    );

    res.json({
      recipeName,
      response,
      availableIngredients,
      sessionId: `${userId}_${Date.now()}` // Simple session ID
    });

  } catch (error) {
    console.error('Start recipe chat error:', error);
    res.status(500).json({ 
      message: 'Failed to start recipe chat',
      error: error.message 
    });
  }
};

// Handle chat messages in recipe conversation
exports.handleChatMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { message, recipeName, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Get user's current inventory
    const inventory = await Item.find({ 
      userId, 
      isUsed: false 
    });

    const availableIngredients = inventory.map(item => item.name);

    // Generate Markdown response
    const markdownReply = await geminiService.handleChatMessage(message, {
      currentRecipe: recipeName,
      availableIngredients,
      conversationHistory: 'Continuing conversation...'
    });

    // ✅ Send it as `reply` (Markdown format preserved)
    return res.status(200).json({ reply: markdownReply });

  } catch (error) {
    console.error('Handle chat message error:', error);
    res.status(500).json({ 
      message: 'Failed to process chat message',
      error: error.message 
    });
  }
};


// Get detailed recipe information
exports.getRecipeDetails = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { recipeName } = req.params;

    // Get user's current inventory
    const inventory = await Item.find({ 
      userId, 
      isUsed: false 
    });

    const availableIngredients = inventory.map(item => item.name);

    // Generate detailed recipe information
    const response = await geminiService.generateRecipeInstructions(
      recipeName,
      availableIngredients,
      `Please provide complete details for making ${recipeName}`
    );

    res.json({
      recipeName,
      details: response,
      availableIngredients
    });

  } catch (error) {
    console.error('Get recipe details error:', error);
    res.status(500).json({ 
      message: 'Failed to get recipe details',
      error: error.message 
    });
  }
};