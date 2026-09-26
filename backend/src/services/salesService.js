const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Customer = require('../models/Customer');
const StockTransaction = require('../models/StockTransaction');
const ReorderRequest = require('../models/ReorderRequest');
const { generateSaleNumber, generateReorderNumber } = require('../utils/idGenerator');

/**
 * Creates a new sale with atomic stock deduction and low-stock reorder triggers
 */
const createSale = async (saleData, userId) => {
  const { customerId, items, discount = 0, paymentMethod } = saleData;

  // 1. Basic validation
  if (!items || !Array.isArray(items) || items.length === 0) {
    const error = new Error('Sale cart cannot be empty');
    error.statusCode = 400;
    error.errorCode = 'EMPTY_CART';
    throw error;
  }

  const validPaymentMethods = ['CASH', 'CARD', 'UPI'];
  if (!paymentMethod || !validPaymentMethods.includes(paymentMethod.toUpperCase())) {
    const error = new Error(`Invalid payment method. Allowed: ${validPaymentMethods.join(', ')}`);
    error.statusCode = 400;
    error.errorCode = 'INVALID_PAYMENT_METHOD';
    throw error;
  }

  const discountAmount = Number(discount) || 0;
  if (discountAmount < 0) {
    const error = new Error('Discount cannot be negative');
    error.statusCode = 400;
    error.errorCode = 'INVALID_DISCOUNT';
    throw error;
  }

  // 2. Fetch all products and inventories, and perform pre-checks
  const parsedItems = [];
  let calculatedSubtotal = 0;

  for (const item of items) {
    const requestedQty = Number(item.quantity);
    if (!item.productId || isNaN(requestedQty) || requestedQty <= 0) {
      const error = new Error('Each item must have a valid productId and quantity greater than zero');
      error.statusCode = 400;
      error.errorCode = 'INVALID_ITEM_QUANTITY';
      throw error;
    }

    const product = await Product.findById(item.productId);
    if (!product) {
      const error = new Error(`Product not found: ${item.productId}`);
      error.statusCode = 404;
      error.errorCode = 'PRODUCT_NOT_FOUND';
      throw error;
    }

    if (!product.isActive) {
      const error = new Error(`Product '${product.name}' (${product.sku}) is deactivated and cannot be sold`);
      error.statusCode = 400;
      error.errorCode = 'INACTIVE_PRODUCT';
      throw error;
    }

    const inventory = await Inventory.findOne({ product: product._id });
    if (!inventory) {
      const error = new Error(`Inventory not found for product '${product.name}'`);
      error.statusCode = 404;
      error.errorCode = 'INVENTORY_NOT_FOUND';
      throw error;
    }

    if (inventory.currentStock <= 0) {
      const error = new Error(`Product '${product.name}' is out of stock`);
      error.statusCode = 400;
      error.errorCode = 'OUT_OF_STOCK';
      throw error;
    }

    if (requestedQty > inventory.currentStock) {
      const error = new Error(`Insufficient stock for '${product.name}'. Only ${inventory.currentStock} units are available.`);
      error.statusCode = 400;
      error.errorCode = 'INSUFFICIENT_STOCK';
      throw error;
    }

    const unitPrice = product.sellingPrice; // Always use database master price!
    const totalPrice = unitPrice * requestedQty;
    calculatedSubtotal += totalPrice;

    parsedItems.push({
      product,
      inventory,
      requestedQty,
      unitPrice,
      totalPrice,
    });
  }

  if (discountAmount > calculatedSubtotal) {
    const error = new Error(`Discount (₹${discountAmount}) cannot exceed subtotal (₹${calculatedSubtotal})`);
    error.statusCode = 400;
    error.errorCode = 'DISCOUNT_EXCEEDS_SUBTOTAL';
    throw error;
  }

  const finalTotalAmount = Math.max(0, calculatedSubtotal - discountAmount);

  // 3. Concurrency-safe atomic stock deduction
  // Track successful decrements so we can rollback if any subsequent item fails
  const successfulDeductions = [];

  try {
    for (const line of parsedItems) {
      const previousStock = line.inventory.currentStock;
      // Atomic conditional update
      const updatedInv = await Inventory.findOneAndUpdate(
        {
          _id: line.inventory._id,
          currentStock: { $gte: line.requestedQty },
        },
        {
          $inc: { currentStock: -line.requestedQty },
        },
        { new: true }
      );

      if (!updatedInv) {
        throw new Error(`Insufficient stock for '${line.product.name}'. Stock was purchased by another transaction.`);
      }

      successfulDeductions.push({
        inventoryId: updatedInv._id,
        productId: line.product._id,
        deductedQty: line.requestedQty,
        previousStock,
        newStock: updatedInv.currentStock,
        updatedInv,
        product: line.product,
      });
    }
  } catch (deductionErr) {
    // Rollback any successfully decremented items
    for (const roll of successfulDeductions) {
      await Inventory.findByIdAndUpdate(roll.inventoryId, {
        $inc: { currentStock: roll.deductedQty },
      });
    }
    const error = new Error(deductionErr.message);
    error.statusCode = 400;
    error.errorCode = 'STOCK_DEDUCTION_FAILED';
    throw error;
  }

  // 4. Create Sale document
  const saleNumber = generateSaleNumber();
  const sale = new Sale({
    saleNumber,
    customer: customerId || null,
    items: [],
    subtotal: calculatedSubtotal,
    discount: discountAmount,
    totalAmount: finalTotalAmount,
    paymentMethod: paymentMethod.toUpperCase(),
    status: 'COMPLETED',
    soldBy: userId,
  });

  await sale.save();

  // 5. Create SaleItems & StockTransactions & Update Inventory Status
  const saleItemIds = [];

  for (let i = 0; i < parsedItems.length; i++) {
    const line = parsedItems[i];
    const deduction = successfulDeductions[i];

    // Create SaleItem
    const saleItem = await SaleItem.create({
      sale: sale._id,
      product: line.product._id,
      quantity: line.requestedQty,
      unitPrice: line.unitPrice,
      totalPrice: line.totalPrice,
    });
    saleItemIds.push(saleItem._id);

    // Create Stock Transaction Audit Log
    await StockTransaction.create({
      product: line.product._id,
      transactionType: 'SALE',
      quantity: -line.requestedQty,
      previousStock: deduction.previousStock,
      newStock: deduction.newStock,
      referenceId: saleNumber,
      referenceType: 'Sale',
      performedBy: userId,
      notes: `Sale completed at POS (${paymentMethod.toUpperCase()})`,
    });

    // Update inventory health status
    const currentStock = deduction.newStock;
    const reorderLevel = line.inventory.reorderLevel;
    const newStatus = Inventory.calculateStatus(currentStock, reorderLevel);
    deduction.updatedInv.status = newStatus;
    await deduction.updatedInv.save();

    // 6. Check low-stock condition and auto-generate ReorderRequest if needed
    if (currentStock <= reorderLevel) {
      const existingPending = await ReorderRequest.findOne({
        product: line.product._id,
        status: 'PENDING',
      });

      if (!existingPending && line.product.supplier) {
        const recommendedQty = Math.max(1, line.inventory.maximumStock - currentStock);
        await ReorderRequest.create({
          requestNumber: generateReorderNumber(),
          product: line.product._id,
          supplier: line.product.supplier,
          currentStock,
          reorderLevel,
          maximumStock: line.inventory.maximumStock,
          recommendedQuantity: recommendedQty,
          status: 'PENDING',
          requestedBy: userId,
        });
      }
    }
  }

  // Update sale with items
  sale.items = saleItemIds;
  await sale.save();

  // 7. Update Customer stats if customer was attached
  if (customerId) {
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { totalPurchases: 1, totalSpent: finalTotalAmount },
    });
  }

  return await getSaleById(sale._id);
};

const getSales = async (query = {}, userRole = 'SALES_STAFF', userId = null) => {
  const filter = {};

  // Sales staff can only view sales created by themselves
  if (userRole === 'SALES_STAFF' && userId) {
    filter.soldBy = userId;
  }

  if (query.status) {
    filter.status = query.status.toUpperCase();
  }

  if (query.paymentMethod) {
    filter.paymentMethod = query.paymentMethod.toUpperCase();
  }

  if (query.customerId) {
    filter.customer = query.customerId;
  }

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) {
      filter.createdAt.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  if (query.search) {
    filter.saleNumber = { $regex: query.search, $options: 'i' };
  }

  return await Sale.find(filter)
    .populate('customer', 'name phone email')
    .populate('soldBy', 'name email role')
    .populate({
      path: 'items',
      populate: { path: 'product', select: 'name sku category unit sellingPrice' },
    })
    .sort({ createdAt: -1 })
    .limit(query.limit ? Number(query.limit) : 100);
};

const getSaleById = async (id) => {
  const sale = await Sale.findById(id)
    .populate('customer', 'name phone email address')
    .populate('soldBy', 'name email role')
    .populate({
      path: 'items',
      populate: { path: 'product', select: 'name sku category unit sellingPrice' },
    });

  if (!sale) {
    const error = new Error('Sale transaction not found');
    error.statusCode = 404;
    error.errorCode = 'SALE_NOT_FOUND';
    throw error;
  }
  return sale;
};

/**
 * Cancel a sale (Admin / Manager only)
 * Restores inventory and creates RETURN stock transactions
 */
const cancelSale = async (id, reason = '', userId) => {
  const sale = await getSaleById(id);

  if (sale.status === 'CANCELLED') {
    const error = new Error('This sale is already cancelled');
    error.statusCode = 400;
    error.errorCode = 'SALE_ALREADY_CANCELLED';
    throw error;
  }

  // Restore inventory for each item
  for (const item of sale.items) {
    const inventory = await Inventory.findOne({ product: item.product._id });
    if (inventory) {
      const previousStock = inventory.currentStock;
      const newStock = previousStock + item.quantity;

      inventory.currentStock = newStock;
      inventory.status = Inventory.calculateStatus(newStock, inventory.reorderLevel);
      await inventory.save();

      // Log Return Stock Transaction
      await StockTransaction.create({
        product: item.product._id,
        transactionType: 'RETURN',
        quantity: item.quantity,
        previousStock,
        newStock,
        referenceId: sale.saleNumber,
        referenceType: 'Sale Cancellation',
        performedBy: userId,
        notes: reason || `Cancelled sale #${sale.saleNumber}`,
      });
    }
  }

  // Revert customer purchase metrics
  if (sale.customer) {
    await Customer.findByIdAndUpdate(sale.customer._id, {
      $inc: { totalPurchases: -1, totalSpent: -sale.totalAmount },
    });
  }

  sale.status = 'CANCELLED';
  await sale.save();

  return sale;
};

module.exports = {
  createSale,
  getSales,
  getSaleById,
  cancelSale,
};
