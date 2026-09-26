const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const StockTransaction = require('../models/StockTransaction');
const ReorderRequest = require('../models/ReorderRequest');

const getSalesReport = async (filters = {}) => {
  const { period = 'month', startDate, endDate } = filters;
  let start = new Date();
  let end = new Date();

  if (startDate && endDate) {
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'week') {
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'month') {
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  const sales = await Sale.find({
    status: 'COMPLETED',
    createdAt: { $gte: start, $lte: end },
  })
    .populate('customer', 'name phone')
    .populate('soldBy', 'name email role')
    .populate({
      path: 'items',
      populate: { path: 'product', select: 'name sku category' },
    })
    .sort({ createdAt: -1 });

  const totalSales = sales.length;
  const grossRevenue = sales.reduce((acc, curr) => acc + curr.subtotal, 0);
  const totalDiscount = sales.reduce((acc, curr) => acc + curr.discount, 0);
  const netRevenue = sales.reduce((acc, curr) => acc + curr.totalAmount, 0);

  // Payment method breakdown
  const paymentBreakdown = { CASH: 0, CARD: 0, UPI: 0 };
  sales.forEach((s) => {
    if (paymentBreakdown[s.paymentMethod] !== undefined) {
      paymentBreakdown[s.paymentMethod] += s.totalAmount;
    }
  });

  return {
    summary: {
      totalSales,
      grossRevenue,
      totalDiscount,
      netRevenue,
      paymentBreakdown,
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    sales,
  };
};

const getInventoryReport = async (filters = {}) => {
  const query = {};
  if (filters.status) {
    query.status = filters.status.toUpperCase();
  }

  const inventories = await Inventory.find(query)
    .populate({
      path: 'product',
      populate: { path: 'supplier', select: 'name phone email' },
    })
    .sort({ status: -1, currentStock: 1 });

  let totalCostValuation = 0;
  let totalRetailValuation = 0;
  let totalUnitsInStock = 0;

  const records = inventories.map((inv) => {
    const product = inv.product || {};
    const cost = (product.costPrice || 0) * inv.currentStock;
    const retail = (product.sellingPrice || 0) * inv.currentStock;

    totalCostValuation += cost;
    totalRetailValuation += retail;
    totalUnitsInStock += inv.currentStock;

    return {
      _id: inv._id,
      productId: product._id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      currentStock: inv.currentStock,
      reorderLevel: inv.reorderLevel,
      maximumStock: inv.maximumStock,
      status: inv.status,
      costValuation: cost,
      retailValuation: retail,
      supplierName: product.supplier ? product.supplier.name : 'N/A',
      lastRestockedAt: inv.lastRestockedAt,
    };
  });

  return {
    summary: {
      totalProductsCount: records.length,
      totalUnitsInStock,
      totalCostValuation,
      totalRetailValuation,
      projectedMargin: totalRetailValuation - totalCostValuation,
    },
    records,
  };
};

const getStockMovementReport = async (filters = {}) => {
  const query = {};
  if (filters.transactionType) {
    query.transactionType = filters.transactionType.toUpperCase();
  }

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const transactions = await StockTransaction.find(query)
    .populate('product', 'name sku category unit')
    .populate('performedBy', 'name email role')
    .sort({ createdAt: -1 })
    .limit(filters.limit ? Number(filters.limit) : 500);

  return transactions;
};

const getReorderReport = async (filters = {}) => {
  const query = {};
  if (filters.status) {
    query.status = filters.status.toUpperCase();
  }

  const reorders = await ReorderRequest.find(query)
    .populate('product', 'name sku category costPrice')
    .populate('supplier', 'name phone email')
    .populate('requestedBy', 'name role')
    .populate('approvedBy', 'name role')
    .sort({ createdAt: -1 });

  return reorders;
};

module.exports = {
  getSalesReport,
  getInventoryReport,
  getStockMovementReport,
  getReorderReport,
};
