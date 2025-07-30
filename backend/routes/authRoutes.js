const express = require('express');
const router = express.Router();
const { register, login, test, resetPassword } = require('../controllers/authController');

router.get('/test', test);
router.post('/register', register);
router.post('/login', login);
router.post('/reset-password', resetPassword);

const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');

router.get('/me', authMiddleware, async (req, res) => {
  try {
    // Use _id instead of userId
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('GET /me error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;