const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');
const ReorderRequest = require('../models/ReorderRequest');
const { generateReorderNumber } = require('../utils/idGenerator');

const getInventory = async (query = {}) => {
  const filter = {};

  if (query.status) {
    filter.status = query.status.toUpperCase();
  }

  let productFilter = {};
  if (query.search) {
    productFilter = {
      $or: [
        { name: { $regex: query.search, $options: 'i' } },
        { sku: { $regex: query.search, $options: 'i' } },
      ],
    };
  }
  if (query.category) {
    productFilter.category = query.category;
  }

  // If filtering by product attributes, find matching product IDs first
  if (Object.keys(productFilter).length > 0) {
    const matchedProducts = await Product.find(productFilter).select('_id');
    filter.product = { $in: matchedProducts.map((p) => p._id) };
  }

  return await Inventory.find(filter)
    .populate({
      path: 'product',
      populate: { path: 'supplier', select: 'name contactPerson email phone status' },
    })
    .sort({ status: -1, currentStock: 1 });
};

const getInventoryById = async (id) => {
  const inventory = await Inventory.findById(id).populate({
    path: 'product',
    populate: { path: 'supplier', select: 'name contactPerson email phone status' },
  });

  if (!inventory) {
    const error = new Error('Inventory record not found');
    error.statusCode = 404;
    error.errorCode = 'INVENTORY_NOT_FOUND';
    throw error;
  }
  return inventory;
};

const getInventoryByProductId = async (productId) => {
  const inventory = await Inventory.findOne({ product: productId }).populate({
    path: 'product',
    populate: { path: 'supplier', select: 'name contactPerson email phone status' },
  });

  if (!inventory) {
    const error = new Error('Inventory record for product not found');
    error.statusCode = 404;
    error.errorCode = 'INVENTORY_NOT_FOUND';
    throw error;
  }
  return inventory;
};

const getStockTransactions = async (query = {}) => {
  const filter = {};

  if (query.productId) {
    filter.product = query.productId;
  }

  if (query.transactionType) {
    filter.transactionType = query.transactionType.toUpperCase();
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

  return await StockTransaction.find(filter)
    .populate('product', 'name sku category unit sellingPrice costPrice')
    .populate('performedBy', 'name email role')
    .sort({ createdAt: -1 })
    .limit(query.limit ? Number(query.limit) : 200);
};

/**
 * Manually adjusts stock (for audits, damages, returns)
 * Admin and Manager only
 */
const adjustStock = async (productId, adjustmentData, userId) => {
  const { quantity, transactionType = 'ADJUSTMENT', notes = '' } = adjustmentData;

  const delta = Number(quantity);
  if (isNaN(delta) || delta === 0) {
    const error = new Error('Adjustment quantity must be a non-zero number');
    error.statusCode = 400;
    error.errorCode = 'INVALID_QUANTITY';
    throw error;
  }

  const validTypes = ['ADJUSTMENT', 'DAMAGE', 'RETURN', 'PURCHASE'];
  if (!validTypes.includes(transactionType)) {
    const error = new Error(`Invalid transaction type. Allowed: ${validTypes.join(', ')}`);
    error.statusCode = 400;
    error.errorCode = 'INVALID_TRANSACTION_TYPE';
    throw error;
  }

  const inventory = await Inventory.findOne({ product: productId }).populate('product');
  if (!inventory) {
    const error = new Error('Inventory record not found');
    error.statusCode = 404;
    throw error;
  }

  const previousStock = inventory.currentStock;
  const newStock = previousStock + delta;

  if (newStock < 0) {
    const error = new Error(`Insufficient stock. Current stock is ${previousStock}, adjustment of ${delta} would result in negative stock.`);
    error.statusCode = 400;
    error.errorCode = 'NEGATIVE_INVENTORY';
    throw error;
  }

  // Update Inventory
  inventory.currentStock = newStock;
  inventory.status = Inventory.calculateStatus(newStock, inventory.reorderLevel);
  if (delta > 0) {
    inventory.lastRestockedAt = new Date();
  }
  await inventory.save();

  // Create Stock Transaction Audit Log
  const transaction = await StockTransaction.create({
    product: productId,
    transactionType,
    quantity: delta,
    previousStock,
    newStock,
    referenceId: `ADJ-${Date.now()}`,
    referenceType: 'Manual Adjustment',
    performedBy: userId,
    notes: notes || `Manual stock adjustment (${transactionType})`,
  });

  // Check low stock and auto-trigger reorder if needed
  if (newStock <= inventory.reorderLevel) {
    const pendingReorder = await ReorderRequest.findOne({
      product: productId,
      status: 'PENDING',
    });

    if (!pendingReorder && inventory.product.supplier) {
      const recommendedQuantity = Math.max(1, inventory.maximumStock - newStock);
      await ReorderRequest.create({
        requestNumber: generateReorderNumber(),
        product: productId,
        supplier: inventory.product.supplier,
        currentStock: newStock,
        reorderLevel: inventory.reorderLevel,
        maximumStock: inventory.maximumStock,
        recommendedQuantity,
        status: 'PENDING',
        requestedBy: userId,
      });
    }
  }

  return {
    inventory,
    transaction,
  };
};

module.exports = {
  getInventory,
  getInventoryById,
  getInventoryByProductId,
  getStockTransactions,
  adjustStock,
};
