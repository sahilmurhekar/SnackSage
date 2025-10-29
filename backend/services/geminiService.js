// /backend/services/geminiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const RAGService = require('./ragService');
const path = require('path');

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Initialize RAG service
    this.ragService = new RAGService();
    this.initializeRAG();
  }

  async initializeRAG() {
    try {
      const pdfPath = path.join(__dirname, '../services/goodfood.pdf');
      await this.ragService.initialize(pdfPath);
      console.log('✅ RAG service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize RAG:', error);
      // Continue without RAG if initialization fails
    }
  }

  // Generate recipe recommendations with RAG context
  async generateRecipeRecommendations(inventory, userPreferences = {}) {
    try {
      const inventoryList = this.formatInventoryForPrompt(inventory);

      // Get relevant context from PDF for recipe generation
      const query = `recipe recommendations for ${Object.keys(inventory).join(', ')} with preferences ${JSON.stringify(userPreferences)}`;
      let contextText = '';

      if (this.ragService.initialized) {
        const relevantChunks = await this.ragService.getContext(query, 2);
        contextText = this.ragService.formatContextForPrompt(relevantChunks);
      }

      const prompt = `
        You are a professional chef and nutritionist with access to specialized food knowledge.

        ${contextText ? `KNOWLEDGE BASE CONTEXT:\n${contextText}\n\n` : ''}

        Based on the following inventory items and the context above, suggest 5 creative and delicious recipes among them 2 must be easy, 2 medium and 1 hard.

        Available Inventory:
        ${inventoryList}

        User Preferences:
        - Diet: ${userPreferences.diet || 'No specific diet'}
        - Health Goals: ${userPreferences.healthGoals?.join(', ') || 'General health'}
        - Cuisine Preferences: ${userPreferences.cuisinePreferences?.join(', ') || 'Any cuisine'}
        - Skill Level: ${userPreferences.skillLevel || 'intermediate'}
        - Household Size: ${userPreferences.householdSize || 2}

        Requirements:
        1. Use insights from the knowledge base context when relevant
        2. Prioritize ingredients that are expiring soon
        3. Each recipe should use at least 3 ingredients from the inventory
        4. Keep recipes practical and achievable
        5. Consider nutritional balance

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

        IMPORTANT: Return ONLY valid JSON. No markdown formatting, no extra text.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean and parse response
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      let recipes;
      try {
        recipes = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        return [];
      }

      if (!Array.isArray(recipes)) {
        return [];
      }

      const validRecipes = recipes.filter(recipe => {
        return recipe.name && recipe.description && recipe.mainIngredients &&
               Array.isArray(recipe.mainIngredients) && recipe.cookingTime &&
               recipe.difficulty && recipe.cuisine;
      });

      return validRecipes;

    } catch (error) {
      console.error('💥 Error generating recipe recommendations:', error);
      return [];
    }
  }

  // Handle chat with RAG-enhanced responses
  async handleChatMessage(message, context = {}) {
    try {
      const { currentRecipe, availableIngredients, conversationHistory } = context;

      // Retrieve relevant context from PDF
      let ragContext = '';
      if (this.ragService.initialized) {
        const relevantChunks = await this.ragService.getContext(message, 3);
        ragContext = this.ragService.formatContextForPrompt(relevantChunks);
      }

      let prompt = `
        You are a friendly, expert chef with access to specialized food knowledge.

        ${ragContext ? `KNOWLEDGE BASE:\n${ragContext}\n\n` : ''}

        Current Context:
        ${currentRecipe ? `- Working on: ${currentRecipe}` : ''}
        ${availableIngredients?.length ? `- Available: ${availableIngredients.join(', ')}` : ''}
        ${conversationHistory ? `- Previous chat: ${conversationHistory}` : ''}

        User's message: "${message}"

        Instructions:
        1. Use information from the knowledge base when relevant
        2. Be conversational, encouraging, and practical
        3. Provide specific, actionable advice
        4. If asked about topics in the knowledge base, draw from that context
        5. Keep responses concise but informative

        Provide your response:
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error handling chat message:', error);
      throw new Error('Failed to process chat message');
    }
  }

  // New method: Ask questions directly about the PDF content
  async askAboutKnowledge(question) {
    try {
      if (!this.ragService.initialized) {
        return "Knowledge base is not available at the moment.";
      }

      const relevantChunks = await this.ragService.getContext(question, 3);
      const contextText = this.ragService.formatContextForPrompt(relevantChunks);

      const prompt = `
        Based on the following context from a food and nutrition knowledge base, answer the user's question.

        CONTEXT:
        ${contextText}

        QUESTION: ${question}

        Provide a clear, accurate answer based on the context above. If the context doesn't contain relevant information, say so.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error querying knowledge base:', error);
      throw new Error('Failed to query knowledge base');
    }
  }

  // Helper methods
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
