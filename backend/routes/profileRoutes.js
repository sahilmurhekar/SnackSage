const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Middleware to verify JWT token (assuming you have this)
const authenticateToken = require('../middleware/authMiddleware');

// GET user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Use _id from MongoDB instead of userId
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// UPDATE user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, preferences } = req.body;

    // Use _id from MongoDB instead of userId
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (name) user.name = name;
    if (preferences) {
      user.preferences = {
        ...user.preferences,
        ...preferences
      };
    }

    await user.save();

    // Return user without password
    const updatedUser = await User.findById(req.user._id).select('-password');
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// INCREMENT recipe view count
router.post('/recipe-viewed', authenticateToken, async (req, res) => {
  try {
    // Use _id from MongoDB instead of userId
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.recipesViewed = (user.recipesViewed || 0) + 1;
    await user.save();

    res.json({
      message: 'Recipe view recorded',
      recipesViewed: user.recipesViewed
    });
  } catch (error) {
    console.error('Error recording recipe view:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET achievements
router.get('/achievements', authenticateToken, async (req, res) => {
  try {
    // Use _id from MongoDB instead of userId
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const recipesViewed = user.recipesViewed || 0;

    const achievements = [
  { id: 1, title: 'First Taste', description: 'View 5 recipes', threshold: 5, icon: '🌱' },
  { id: 2, title: 'Getting Started', description: 'View 10 recipes', threshold: 10, icon: '👨‍🍳' },
  { id: 3, title: 'Recipe Explorer', description: 'View 25 recipes', threshold: 25, icon: '🔍' },
  { id: 4, title: 'Cooking Enthusiast', description: 'View 50 recipes', threshold: 50, icon: '🍳' },
  { id: 5, title: 'Kitchen Regular', description: 'View 75 recipes', threshold: 75, icon: '👩‍🍳' },
  { id: 6, title: 'Recipe Master', description: 'View 100 recipes', threshold: 100, icon: '⭐' },
  { id: 7, title: 'Culinary Expert', description: 'View 150 recipes', threshold: 150, icon: '🏆' },
  { id: 8, title: 'Master Chef', description: 'View 200 recipes', threshold: 200, icon: '🎖️' },
  { id: 9, title: 'Legendary Cook', description: 'View 500 recipes', threshold: 500, icon: '🌟' }
];

    const unlockedAchievements = achievements.map(achievement => ({
      ...achievement,
      unlocked: recipesViewed >= achievement.threshold,
      progress: Math.min((recipesViewed / achievement.threshold) * 100, 100)
    }));

    res.json({
      recipesViewed,
      achievements: unlockedAchievements,
      totalUnlocked: unlockedAchievements.filter(a => a.unlocked).length
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
