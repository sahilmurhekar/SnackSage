// /backend/services/ragService.js
const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class RAGService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });

    // Store chunks and embeddings in memory (use a proper vector DB for production)
    this.documentChunks = [];
    this.initialized = false;
  }

  // Initialize RAG by processing the PDF
  async initialize(pdfPath) {
    try {
      console.log('🔄 Initializing RAG with PDF:', pdfPath);

      // Read and parse PDF
      const dataBuffer = await fs.readFile(pdfPath);
      const pdfData = await pdf(dataBuffer);

      console.log('📄 PDF extracted, pages:', pdfData.numpages);

      // Split text into chunks
      const chunks = this.splitIntoChunks(pdfData.text, 1000, 200);
      console.log('✂️ Created chunks:', chunks.length);

      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await this.generateEmbedding(chunks[i]);
        this.documentChunks.push({
          id: i,
          text: chunks[i],
          embedding: embedding
        });

        // Rate limiting - wait a bit between requests
        if (i < chunks.length - 1) {
          await this.sleep(100);
        }
      }

      this.initialized = true;
      console.log('✅ RAG initialization complete');

    } catch (error) {
      console.error('❌ Error initializing RAG:', error);
      throw error;
    }
  }

  // Split text into overlapping chunks
  splitIntoChunks(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());

        // Keep last part for overlap
        const words = currentChunk.split(' ');
        const overlapWords = Math.floor(overlap / 5); // Approximate words for overlap
        currentChunk = words.slice(-overlapWords).join(' ') + ' ' + sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  // Generate embedding for text using Gemini
  async generateEmbedding(text) {
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Retrieve most relevant chunks for a query
  async retrieveRelevantChunks(query, topK = 3) {
    if (!this.initialized) {
      throw new Error('RAG service not initialized. Call initialize() first.');
    }

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Calculate similarity scores for all chunks
      const scores = this.documentChunks.map(chunk => ({
        ...chunk,
        similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
      }));

      // Sort by similarity and return top K
      scores.sort((a, b) => b.similarity - a.similarity);
      return scores.slice(0, topK);

    } catch (error) {
      console.error('Error retrieving chunks:', error);
      throw error;
    }
  }

  // Get augmented context for a query
  async getContext(query, topK = 3) {
    const relevantChunks = await this.retrieveRelevantChunks(query, topK);

    return relevantChunks.map(chunk => ({
      text: chunk.text,
      similarity: chunk.similarity.toFixed(3)
    }));
  }

  // Format context for prompt
  formatContextForPrompt(chunks) {
    if (!chunks || chunks.length === 0) {
      return 'No relevant context found in the knowledge base.';
    }

    return chunks.map((chunk, index) =>
      `[Context ${index + 1}] (Relevance: ${chunk.similarity})\n${chunk.text}`
    ).join('\n\n---\n\n');
  }

  // Helper sleep function
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = RAGService;
