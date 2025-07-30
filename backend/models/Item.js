const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['vegetables', 'fruits', 'dairy', 'meat', 'grains', 'pantry', 'spices', 'beverages', 'frozen', 'canned', 'other'],
    default: 'other'
  },
  quantity: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true,
      enum: ['pieces', 'kg', 'g', 'lb', 'oz', 'l', 'ml', 'cups', 'tbsp', 'tsp', 'packets', 'cans', 'bottles']
    }
  },
  expirationDate: {
    type: Date,
    required: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  nutritionalInfo: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 }
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedDate: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: 500
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

// Index for efficient queries
itemSchema.index({ userId: 1, isUsed: 1 });
itemSchema.index({ userId: 1, expirationDate: 1 });
itemSchema.index({ userId: 1, category: 1 });

// Update the updatedAt field before saving
itemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual field to check if item is expiring soon (within 3 days)
itemSchema.virtual('isExpiringSoon').get(function() {
  const today = new Date();
  const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));
  return this.expirationDate <= threeDaysFromNow && this.expirationDate >= today;
});

// Virtual field to check if item is expired
itemSchema.virtual('isExpired').get(function() {
  return this.expirationDate < new Date();
});

module.exports = mongoose.model('Item', itemSchema);