const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    default: () => uuidv4(),
    required: true
  },
  pushToken: {
    type: String,
    default: null
  },
  name: String,
  email: { type: String, unique: true },
  password: String,
  authProvider: String,
  preferences: {
    diet: String,
    healthGoals: [String],
    cuisinePreferences: [String],
    skillLevel: String,
    householdSize: Number,
    mealFrequency: String
  },
  // New field for tracking recipe views
  recipesViewed: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);
