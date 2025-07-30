const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  addItem,
  getInventory,
  getExpiringSoon,
  getDashboardStats,
  updateItem,
  deleteItem
} = require('../controllers/itemController');

// All routes require authentication
router.use(authMiddleware);

// Add new item
router.post('/add', addItem);

// Get user's inventory
router.get('/inventory', getInventory);

// Get items expiring soon
router.get('/expiring-soon', getExpiringSoon);

// Get dashboard statistics
router.get('/dashboard-stats', getDashboardStats);

// Delete item
router.delete('/:itemId', deleteItem);

module.exports = router;