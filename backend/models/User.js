const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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
  createdAt: Date,
  updatedAt: Date
});

module.exports = mongoose.model('User', userSchema);
