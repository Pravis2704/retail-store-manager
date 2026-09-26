const ReorderRequest = require('../models/ReorderRequest');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Supplier = require('../models/Supplier');
const StockTransaction = require('../models/StockTransaction');
const { generateReorderNumber } = require('../utils/idGenerator');

const getReorders = async (query = {}) => {
  const filter = {};

  if (query.status) {
    filter.status = query.status.toUpperCase();
  }

  if (query.supplierId) {
    filter.supplier = query.supplierId;
  }

  if (query.productId) {
    filter.product = query.productId;
  }

  return await ReorderRequest.find(filter)
    .populate('product', 'name sku category unit costPrice sellingPrice')
    .populate('supplier', 'name contactPerson phone email status')
    .populate('requestedBy', 'name email role')
    .populate('approvedBy', 'name email role')
    .sort({ createdAt: -1 });
};

const getReorderById = async (id) => {
  const reorder = await ReorderRequest.findById(id)
    .populate('product', 'name sku category unit costPrice sellingPrice reorderLevel maximumStock')
    .populate('supplier', 'name contactPerson phone email address status')
    .populate('requestedBy', 'name email role')
    .populate('approvedBy', 'name email role');

  if (!reorder) {
    const error = new Error('Reorder request not found');
    error.statusCode = 404;
    error.errorCode = 'REORDER_NOT_FOUND';
    throw error;
  }

  return reorder;
};

/**
 * Create a new reorder request (Manual or System)
 */
const createReorder = async (data, userId) => {
  const { productId, quantity, supplierId } = data;

  if (!productId) {
    const error = new Error('Product ID is required');
    error.statusCode = 400;
    error.errorCode = 'MISSING_PRODUCT_ID';
    throw error;
  }

  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    error.errorCode = 'PRODUCT_NOT_FOUND';
    throw error;
  }

  const inventory = await Inventory.findOne({ product: product._id });
  if (!inventory) {
    const error = new Error('Inventory record not found for this product');
    error.statusCode = 404;
    throw error;
  }

  // Prevent duplicate pending reorder requests for the same product
  const existingPending = await ReorderRequest.findOne({
    product: product._id,
    status: 'PENDING',
  });

  if (existingPending) {
    const error = new Error(`A pending reorder request (${existingPending.requestNumber}) already exists for '${product.name}'`);
    error.statusCode = 409;
    error.errorCode = 'DUPLICATE_PENDING_REORDER';
    throw error;
  }

  // Determine supplier
  const targetSupplierId = supplierId || product.supplier;
  const supplier = await Supplier.findById(targetSupplierId);
  if (!supplier) {
    const error = new Error('Supplier not found');
    error.statusCode = 404;
    throw error;
  }

  if (supplier.status === 'INACTIVE') {
    const error = new Error(`Supplier '${supplier.name}' is inactive and cannot accept new reorder requests`);
    error.statusCode = 400;
    error.errorCode = 'INACTIVE_SUPPLIER';
    throw error;
  }

  // Calculate recommended quantity
  const defaultRecommended = Math.max(1, inventory.maximumStock - inventory.currentStock);
  const reorderQty = quantity !== undefined ? Number(quantity) : defaultRecommended;

  if (isNaN(reorderQty) || reorderQty <= 0) {
    const error = new Error('Reorder quantity must be greater than zero');
    error.statusCode = 400;
    error.errorCode = 'INVALID_QUANTITY';
    throw error;
  }

  const reorder = await ReorderRequest.create({
    requestNumber: generateReorderNumber(),
    product: product._id,
    supplier: supplier._id,
    currentStock: inventory.currentStock,
    reorderLevel: inventory.reorderLevel,
    maximumStock: inventory.maximumStock,
    recommendedQuantity: reorderQty,
    status: 'PENDING',
    requestedBy: userId,
  });

  return await getReorderById(reorder._id);
};

/**
 * Approve a pending reorder request (Admin / Manager only)
 */
const approveReorder = async (id, userId) => {
  const reorder = await ReorderRequest.findById(id);
  if (!reorder) {
    const error = new Error('Reorder request not found');
    error.statusCode = 404;
    throw error;
  }

  if (reorder.status !== 'PENDING') {
    const error = new Error(`Cannot approve reorder request with status '${reorder.status}'. Only PENDING requests can be approved.`);
    error.statusCode = 400;
    error.errorCode = 'INVALID_REORDER_STATUS';
    throw error;
  }

  reorder.status = 'APPROVED';
  reorder.approvedBy = userId;
  reorder.approvedAt = new Date();
  await reorder.save();

  return await getReorderById(reorder._id);
};

/**
 * Reject a pending reorder request (Admin / Manager only)
 */
const rejectReorder = async (id, rejectionReason, userId) => {
  if (!rejectionReason || !rejectionReason.trim()) {
    const error = new Error('A rejection reason is required');
    error.statusCode = 400;
    error.errorCode = 'REJECTION_REASON_REQUIRED';
    throw error;
  }

  const reorder = await ReorderRequest.findById(id);
  if (!reorder) {
    const error = new Error('Reorder request not found');
    error.statusCode = 404;
    throw error;
  }

  if (reorder.status !== 'PENDING') {
    const error = new Error(`Cannot reject reorder request with status '${reorder.status}'. Only PENDING requests can be rejected.`);
    error.statusCode = 400;
    error.errorCode = 'INVALID_REORDER_STATUS';
    throw error;
  }

  reorder.status = 'REJECTED';
  reorder.rejectionReason = rejectionReason.trim();
  reorder.approvedBy = userId;
  reorder.approvedAt = new Date();
  await reorder.save();

  return await getReorderById(reorder._id);
};

/**
 * Receive delivered goods, replenish stock, log PURCHASE audit transaction, mark COMPLETED
 */
const receiveGoods = async (id, receiveData, userId) => {
  const { receivedQuantity } = receiveData;
  const qty = Number(receivedQuantity);

  if (isNaN(qty) || qty <= 0) {
    const error = new Error('Received quantity must be greater than zero');
    error.statusCode = 400;
    error.errorCode = 'INVALID_RECEIVED_QUANTITY';
    throw error;
  }

  const reorder = await ReorderRequest.findById(id).populate('product');
  if (!reorder) {
    const error = new Error('Reorder request not found');
    error.statusCode = 404;
    throw error;
  }

  if (reorder.status !== 'APPROVED') {
    const error = new Error(`Cannot receive goods for reorder with status '${reorder.status}'. Goods can only be received for APPROVED orders.`);
    error.statusCode = 400;
    error.errorCode = 'ORDER_NOT_APPROVED';
    throw error;
  }

  const inventory = await Inventory.findOne({ product: reorder.product._id });
  if (!inventory) {
    const error = new Error('Inventory record not found');
    error.statusCode = 404;
    throw error;
  }

  const previousStock = inventory.currentStock;
  const newStock = previousStock + qty;

  // 1. Update Inventory
  inventory.currentStock = newStock;
  inventory.status = Inventory.calculateStatus(newStock, inventory.reorderLevel);
  inventory.lastRestockedAt = new Date();
  await inventory.save();

  // 2. Create PURCHASE Stock Transaction Audit Log
  await StockTransaction.create({
    product: reorder.product._id,
    transactionType: 'PURCHASE',
    quantity: qty,
    previousStock,
    newStock,
    referenceId: reorder.requestNumber,
    referenceType: 'Reorder Fulfillment',
    performedBy: userId,
    notes: `Received shipment of ${qty} units for Order #${reorder.requestNumber}`,
  });

  // 3. Mark Reorder Completed
  reorder.receivedQuantity = qty;
  reorder.status = 'COMPLETED';
  await reorder.save();

  return await getReorderById(reorder._id);
};

/**
 * OPTIONAL AI FEATURE: Smart Reorder Recommendation Engine
 * Analyzes sales history velocity, supplier lead time, and current stock to recommend optimal purchase quantities
 */
const getSmartReorderRecommendations = async () => {
  const products = await Product.find({ isActive: true })
    .populate('supplier', 'name phone email status')
    .lean();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Aggregate past 30 days sales by product
  const SaleItem = require('../models/SaleItem');
  const salesVelocity = await SaleItem.aggregate([
    {
      $lookup: {
        from: 'sales',
        localField: 'sale',
        foreignField: '_id',
        as: 'saleDoc',
      },
    },
    { $unwind: '$saleDoc' },
    {
      $match: {
        'saleDoc.status': 'COMPLETED',
        'saleDoc.createdAt': { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: '$product',
        totalUnitsSold: { $sum: '$quantity' },
        totalOrdersCount: { $sum: 1 },
      },
    },
  ]);

  const velocityMap = {};
  salesVelocity.forEach((v) => {
    velocityMap[v._id.toString()] = v;
  });

  // Fetch live inventory for all products
  const productIds = products.map((p) => p._id);
  const inventories = await Inventory.find({ product: { $in: productIds } }).lean();
  const inventoryMap = {};
  inventories.forEach((inv) => {
    inventoryMap[inv.product.toString()] = inv;
  });

  // Fetch pending reorders to flag existing requisitions
  const pendingReorders = await ReorderRequest.find({
    product: { $in: productIds },
    status: 'PENDING',
  }).lean();
  const pendingMap = {};
  pendingReorders.forEach((po) => {
    pendingMap[po.product.toString()] = po;
  });

  const recommendations = [];

  for (const product of products) {
    const inv = inventoryMap[product._id.toString()] || {
      currentStock: 0,
      reorderLevel: product.reorderLevel,
      maximumStock: product.maximumStock,
      status: 'OUT_OF_STOCK',
    };

    const currentStock = inv.currentStock;
    const reorderLevel = product.reorderLevel;
    const maxStock = product.maximumStock;

    // Sales velocity metrics
    const stats = velocityMap[product._id.toString()] || { totalUnitsSold: 0, totalOrdersCount: 0 };
    const unitsSold30d = stats.totalUnitsSold;
    const avgDailySales = Number((unitsSold30d / 30).toFixed(2));

    // Category-informed supplier lead time (days)
    let leadTimeDays = 4;
    if (product.category === 'Dairy & Eggs') leadTimeDays = 2;
    else if (product.category === 'Grains & Staples') leadTimeDays = 5;
    else if (product.category === 'Beverages') leadTimeDays = 3;

    // Buffer / Safety stock
    const safetyStock = Math.max(2, Math.ceil(avgDailySales * 3));

    // Days until stockout
    let daysToStockout = 999;
    if (currentStock === 0) {
      daysToStockout = 0;
    } else if (avgDailySales > 0) {
      daysToStockout = Number((currentStock / avgDailySales).toFixed(1));
    }

    // Recommendation calculations
    const baselineRecommended = Math.max(0, maxStock - currentStock);
    const leadTimeDemand = Math.ceil(avgDailySales * leadTimeDays);
    const dynamicSmartQuantity = Math.min(
      maxStock - currentStock,
      Math.max(baselineRecommended, leadTimeDemand + safetyStock)
    );

    // Urgency categorization
    let urgency = 'NORMAL';
    if (currentStock === 0 || daysToStockout <= leadTimeDays) {
      urgency = 'CRITICAL';
    } else if (currentStock <= reorderLevel || daysToStockout <= leadTimeDays * 2) {
      urgency = 'HIGH';
    }

    // Explanatory reasoning
    let reasoning = '';
    if (currentStock === 0) {
      reasoning = `Completely depleted. Immediate replenishment of ${baselineRecommended} ${product.unit} required to satisfy daily customer demand.`;
    } else if (daysToStockout <= leadTimeDays) {
      reasoning = `Current velocity (${avgDailySales} units/day) indicates stockout in ${daysToStockout} days, which is less than the ${leadTimeDays}-day supplier lead time. Order urgently!`;
    } else if (currentStock <= reorderLevel) {
      reasoning = `Stock has reached the reorder threshold (${reorderLevel}). Recommended replenishment of ${baselineRecommended} units to reach optimal warehouse capacity (${maxStock}).`;
    } else {
      reasoning = `Inventory healthy. Current supply projected to last ${daysToStockout} days at current velocity.`;
    }

    const pendingPO = pendingMap[product._id.toString()];

    recommendations.push({
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        unit: product.unit,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
      },
      supplier: product.supplier,
      currentStock,
      reorderLevel,
      maximumStock: maxStock,
      avgDailySales,
      unitsSoldPast30Days: unitsSold30d,
      estimatedLeadTimeDays: leadTimeDays,
      safetyStockBuffer: safetyStock,
      projectedDaysToStockout: daysToStockout === 999 ? '30+' : daysToStockout,
      baselineQuantity: baselineRecommended,
      smartRecommendedQuantity: Math.max(1, dynamicSmartQuantity || baselineRecommended),
      urgency,
      reasoning,
      hasPendingReorder: !!pendingPO,
      pendingReorderNumber: pendingPO?.requestNumber || null,
    });
  }

  // Sort by urgency: CRITICAL first, then HIGH, then NORMAL
  const urgencyWeight = { CRITICAL: 0, HIGH: 1, NORMAL: 2 };
  recommendations.sort((a, b) => urgencyWeight[a.urgency] - urgencyWeight[b.urgency]);

  return recommendations;
};

module.exports = {
  getReorders,
  getReorderById,
  createReorder,
  approveReorder,
  rejectReorder,
  receiveGoods,
  getSmartReorderRecommendations,
};

