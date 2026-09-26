const mongoose = require('mongoose');

const reorderRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      required: [true, 'Request number is required'],
      unique: true,
      trim: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier reference is required'],
    },
    currentStock: {
      type: Number,
      required: [true, 'Current stock snapshot is required'],
      min: [0, 'Current stock cannot be negative'],
    },
    reorderLevel: {
      type: Number,
      required: [true, 'Reorder level snapshot is required'],
      min: [0, 'Reorder level cannot be negative'],
    },
    maximumStock: {
      type: Number,
      required: [true, 'Maximum stock snapshot is required'],
    },
    recommendedQuantity: {
      type: Number,
      required: [true, 'Recommended quantity is required'],
      min: [1, 'Recommended quantity must be at least 1'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'],
      default: 'PENDING',
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true,
    },
    receivedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Received quantity cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

reorderRequestSchema.index({ product: 1, status: 1 });
reorderRequestSchema.index({ status: 1 });

const ReorderRequest = mongoose.model('ReorderRequest', reorderRequestSchema);
module.exports = ReorderRequest;
