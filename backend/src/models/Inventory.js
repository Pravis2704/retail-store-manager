const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      unique: true,
    },
    currentStock: {
      type: Number,
      required: [true, 'Current stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    reorderLevel: {
      type: Number,
      required: [true, 'Reorder level is required'],
      min: [0, 'Reorder level cannot be negative'],
    },
    maximumStock: {
      type: Number,
      required: [true, 'Maximum stock is required'],
      min: [1, 'Maximum stock must be at least 1'],
    },
    status: {
      type: String,
      enum: ['NORMAL', 'LOW_STOCK', 'OUT_OF_STOCK'],
      default: 'NORMAL',
    },
    lastRestockedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Calculates health status based on stock and reorder level
 */
inventorySchema.statics.calculateStatus = function (currentStock, reorderLevel) {
  if (currentStock <= 0) return 'OUT_OF_STOCK';
  if (currentStock <= reorderLevel) return 'LOW_STOCK';
  return 'NORMAL';
};

inventorySchema.pre('save', function (next) {
  this.status = this.constructor.calculateStatus(this.currentStock, this.reorderLevel);
  next();
});

inventorySchema.index({ status: 1 });
inventorySchema.index({ currentStock: 1 });

const Inventory = mongoose.model('Inventory', inventorySchema);
module.exports = Inventory;
