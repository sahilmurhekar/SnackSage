const Item = require('../models/Item');

// Add new item
exports.addItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const itemData = {
      ...req.body,
      userId
    };

    const item = new Item(itemData);
    await item.save();

    res.status(201).json({ 
      message: 'Item added successfully', 
      item 
    });
  } catch (err) {
    console.error('Add item error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user's inventory
exports.getInventory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { category, showUsed = false } = req.query;

    let query = { userId };
    if (!showUsed) {
      query.isUsed = false;
    }
    if (category && category !== 'all') {
      query.category = category;
    }

    const items = await Item.find(query).sort({ expirationDate: 1 });

    // Group items by category for better organization
    const inventory = items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});

    res.json({ inventory, totalItems: items.length });
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get items expiring soon
exports.getExpiringSoon = async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));

    const expiringSoon = await Item.find({
      userId,
      isUsed: false,
      expirationDate: { 
        $gte: today, 
        $lte: threeDaysFromNow 
      }
    }).sort({ expirationDate: 1 });

    res.json({ expiringSoon });
  } catch (err) {
    console.error('Get expiring items error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));

    // Get total items
    const totalItems = await Item.countDocuments({ userId, isUsed: false });

    // Get expiring soon count
    const expiringSoonCount = await Item.countDocuments({
      userId,
      isUsed: false,
      expirationDate: { $gte: today, $lte: threeDaysFromNow }
    });

    // Get expired items count
    const expiredCount = await Item.countDocuments({
      userId,
      isUsed: false,
      expirationDate: { $lt: today }
    });

    // Get category breakdown
    const categoryStats = await Item.aggregate([
      { $match: { userId, isUsed: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get recent items (last 7 days)
    const sevenDaysAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
    const recentItemsCount = await Item.countDocuments({
      userId,
      createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
      totalItems,
      expiringSoonCount,
      expiredCount,
      categoryStats,
      recentItemsCount
    });
  } catch (err) {
    console.error('Get dashboard stats error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete item
exports.deleteItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    const item = await Item.findOneAndDelete({ _id: itemId, userId });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// Update item
exports.updateItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;
    const updateData = {
      ...req.body,
      userId, // Ensure userId remains unchanged
      updatedAt: new Date()
    };

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;

    const item = await Item.findOneAndUpdate(
      { _id: itemId, userId }, // Only allow updating user's own items
      updateData,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({
      message: 'Item updated successfully',
      item
    });
  } catch (err) {
    console.error('Update item error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get single item by ID
exports.getItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    const item = await Item.findOne({ _id: itemId, userId });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ item });
  } catch (err) {
    console.error('Get item error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};