const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    transactionType: {
      type: String,
      enum: ['PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'DAMAGE'],
      required: [true, 'Transaction type is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
    },
    previousStock: {
      type: Number,
      required: [true, 'Previous stock is required'],
      min: [0, 'Previous stock cannot be negative'],
    },
    newStock: {
      type: Number,
      required: [true, 'New stock is required'],
      min: [0, 'New stock cannot be negative'],
    },
    referenceId: {
      type: String,
      default: '',
      trim: true,
    },
    referenceType: {
      type: String,
      default: '',
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Audit records are immutable
  }
);

stockTransactionSchema.index({ product: 1, createdAt: -1 });
stockTransactionSchema.index({ transactionType: 1 });
stockTransactionSchema.index({ referenceId: 1 });

const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);
module.exports = StockTransaction;
