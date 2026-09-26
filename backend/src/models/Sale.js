const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema(
  {
    saleNumber: {
      type: String,
      required: [true, 'Sale number is required'],
      unique: true,
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SaleItem',
      },
    ],
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative'],
    },
    discount: {
      type: Number,
      required: [true, 'Discount is required'],
      min: [0, 'Discount cannot be negative'],
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'UPI'],
      required: [true, 'Payment method is required'],
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'CANCELLED'],
      default: 'COMPLETED',
    },
    soldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sales user reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

saleSchema.index({ createdAt: -1 });
saleSchema.index({ soldBy: 1 });
saleSchema.index({ customer: 1 });

const Sale = mongoose.model('Sale', saleSchema);
module.exports = Sale;
