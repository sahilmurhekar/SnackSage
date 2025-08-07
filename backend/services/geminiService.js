// /backend/services/geminiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  }

  // Generate recipe recommendations based on inventory
  async generateRecipeRecommendations(inventory, userPreferences = {}) {
    try {
      const inventoryList = this.formatInventoryForPrompt(inventory);
      
      const prompt = `
        You are a professional chef and nutritionist. Based on the following inventory items, suggest 5 creative and delicious recipes that can be made with these ingredients.

        Available Inventory:
        ${inventoryList}

        User Preferences:
        - Diet: ${userPreferences.diet || 'No specific diet'}
        - Health Goals: ${userPreferences.healthGoals?.join(', ') || 'General health'}
        - Cuisine Preferences: ${userPreferences.cuisinePreferences?.join(', ') || 'Any cuisine'}
        - Skill Level: ${userPreferences.skillLevel || 'intermediate'}
        - Household Size: ${userPreferences.householdSize || 2}

        Requirements:
        1. Prioritize ingredients that are expiring soon
        2. Each recipe should use at least 3 ingredients from the inventory
        3. Keep recipes practical and achievable
        4. Consider nutritional balance
        5. Provide variety in cooking methods and cuisines

        Return ONLY a JSON array with exactly this structure:
        [
          {
            "name": "Recipe Name",
            "description": "Brief appetizing description in 15-20 words",
            "mainIngredients": ["ingredient1", "ingredient2", "ingredient3"],
            "cookingTime": "30 minutes",
            "difficulty": "Easy|Medium|Hard",
            "cuisine": "Cuisine type",
            "healthScore": 8.5,
            "servings": 2
          }
        ]

        Make sure the JSON is valid and contains exactly 5 recipes.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the JSON response
      const recipes = JSON.parse(text.trim());
      
      // Validate the response structure
      if (!Array.isArray(recipes) || recipes.length === 0) {
        throw new Error('Invalid response format from Gemini');
      }

      return recipes;
    } catch (error) {
      console.error('Error generating recipe recommendations:', error);
      throw new Error('Failed to generate recipe recommendations');
    }
  }

  // Generate detailed recipe instructions for chatbot
  // Enhanced generateRecipeRecommendations method with better error handling
async generateRecipeRecommendations(inventory, userPreferences = {}) {
  try {
    const inventoryList = this.formatInventoryForPrompt(inventory);
    
    console.log('🔍 Generating recommendations for inventory:', inventoryList);
    
    const prompt = `
      You are a professional chef and nutritionist. Based on the following inventory items, suggest 5 creative and delicious recipes that can be made with these ingredients.

      Available Inventory:
      ${inventoryList}

      User Preferences:
      - Diet: ${userPreferences.diet || 'No specific diet'}
      - Health Goals: ${userPreferences.healthGoals?.join(', ') || 'General health'}
      - Cuisine Preferences: ${userPreferences.cuisinePreferences?.join(', ') || 'Any cuisine'}
      - Skill Level: ${userPreferences.skillLevel || 'intermediate'}
      - Household Size: ${userPreferences.householdSize || 2}

      Requirements:
      1. Prioritize ingredients that are expiring soon
      2. Each recipe should use at least 3 ingredients from the inventory
      3. Keep recipes practical and achievable
      4. Consider nutritional balance
      5. Provide variety in cooking methods and cuisines

      Return ONLY a JSON array with exactly this structure:
      [
        {
          "name": "Recipe Name",
          "description": "Brief appetizing description in 15-20 words",
          "mainIngredients": ["ingredient1", "ingredient2", "ingredient3"],
          "cookingTime": "30 minutes",
          "difficulty": "Easy",
          "cuisine": "Cuisine type",
          "healthScore": 8,
          "servings": 2
        }
      ]

      IMPORTANT: Return ONLY valid JSON. No markdown formatting, no extra text, just the JSON array.
    `;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('🤖 Raw Gemini response:', text);
    
    // Clean the response - remove markdown formatting if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    console.log('🧹 Cleaned response:', cleanedText);
    
    // Parse the JSON response
    let recipes;
    try {
      recipes = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      console.error('📝 Text that failed to parse:', cleanedText);
      
      // Fallback: return empty array instead of crashing
      return [];
    }
    
    // Validate the response structure
    if (!Array.isArray(recipes)) {
      console.error('❌ Response is not an array:', recipes);
      return [];
    }
    
    if (recipes.length === 0) {
      console.log('⚠️ No recipes returned from Gemini');
      return [];
    }
    
    // Validate each recipe has required fields
    const validRecipes = recipes.filter(recipe => {
      const isValid = recipe.name && recipe.description && recipe.mainIngredients && 
                     Array.isArray(recipe.mainIngredients) && recipe.cookingTime && 
                     recipe.difficulty && recipe.cuisine;
      
      if (!isValid) {
        console.log('⚠️ Invalid recipe filtered out:', recipe);
      }
      return isValid;
    });
    
    console.log('✅ Valid recipes found:', validRecipes.length);
    return validRecipes;
    
  } catch (error) {
    console.error('💥 Error generating recipe recommendations:', error);
    console.error('📍 Error stack:', error.stack);
    
    // Return empty array instead of throwing error to prevent dashboard crash
    return [];
  }
}

  // Handle general chat about cooking/recipes
  async handleChatMessage(message, context = {}) {
    try {
      const { currentRecipe, availableIngredients, conversationHistory } = context;
      
      let prompt = `
        You are a friendly, expert chef helping someone cook. 
        ${currentRecipe ? `They are currently working on: ${currentRecipe}` : ''}
        ${availableIngredients?.length ? `Available ingredients: ${availableIngredients.join(', ')}` : ''}
        
        Previous conversation context: ${conversationHistory || 'New conversation'}
        
        User's message: "${message}"
        
        Provide a helpful, conversational response. Be encouraging, practical, and specific.
        If they're asking about substitutions, alternatives, or cooking tips, be detailed.
        Keep responses concise but informative.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error handling chat message:', error);
      throw new Error('Failed to process chat message');
    }
  }

  // Helper method to format inventory for prompts
  formatInventoryForPrompt(inventory) {
    let inventoryText = '';
    
    Object.entries(inventory).forEach(([category, items]) => {
      inventoryText += `\n${category.toUpperCase()}:\n`;
      items.forEach(item => {
        const expirationStatus = this.getExpirationStatus(item.expirationDate);
        inventoryText += `- ${item.name} (${item.quantity.amount} ${item.quantity.unit})${expirationStatus}\n`;
      });
    });
    
    return inventoryText;
  }

  // Helper to determine expiration status
  getExpirationStatus(expirationDate) {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiry = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return ' [EXPIRED]';
    if (daysUntilExpiry <= 2) return ' [EXPIRES SOON]';
    if (daysUntilExpiry <= 7) return ' [USE WITHIN WEEK]';
    return '';
  }
}

module.exports = GeminiService;