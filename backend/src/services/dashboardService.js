const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Customer = require('../models/Customer');
const ReorderRequest = require('../models/ReorderRequest');

/**
 * Returns summary KPIs, counts, and urgent alerts
 */
const getSummary = async () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // 1. Total counts
  const totalProducts = await Product.countDocuments({ isActive: true });
  const totalCustomers = await Customer.countDocuments();

  // 2. Today's sales & revenue
  const todaySales = await Sale.find({
    status: 'COMPLETED',
    createdAt: { $gte: todayStart, $lte: todayEnd },
  });

  const totalSalesToday = todaySales.length;
  const todayRevenue = todaySales.reduce((acc, curr) => acc + curr.totalAmount, 0);

  // 3. Inventory health
  const lowStockCount = await Inventory.countDocuments({ status: 'LOW_STOCK' });
  const outOfStockCount = await Inventory.countDocuments({ status: 'OUT_OF_STOCK' });
  const normalStockCount = await Inventory.countDocuments({ status: 'NORMAL' });

  // 4. Pending reorders
  const pendingReordersCount = await ReorderRequest.countDocuments({ status: 'PENDING' });

  // 5. Urgent Alert lists
  const urgentLowStock = await Inventory.find({
    status: { $in: ['LOW_STOCK', 'OUT_OF_STOCK'] },
  })
    .populate('product', 'name sku category unit')
    .sort({ currentStock: 1 })
    .limit(5);

  const pendingReordersList = await ReorderRequest.find({ status: 'PENDING' })
    .populate('product', 'name sku unit')
    .populate('supplier', 'name phone')
    .sort({ createdAt: -1 })
    .limit(5);

  return {
    kpis: {
      totalProducts,
      totalCustomers,
      totalSalesToday,
      todayRevenue,
      lowStockCount,
      outOfStockCount,
      normalStockCount,
      pendingReordersCount,
    },
    inventoryStatusBreakdown: [
      { status: 'NORMAL', count: normalStockCount, label: 'Optimal Stock' },
      { status: 'LOW_STOCK', count: lowStockCount, label: 'Low Stock' },
      { status: 'OUT_OF_STOCK', count: outOfStockCount, label: 'Out of Stock' },
    ],
    alerts: {
      lowStockMessage: lowStockCount > 0 ? `${lowStockCount} product(s) require replenishment attention.` : null,
      pendingReordersMessage: pendingReordersCount > 0 ? `${pendingReordersCount} purchase requisition(s) awaiting manager review.` : null,
      lowStockItems: urgentLowStock,
      pendingReorders: pendingReordersList,
    },
  };
};

/**
 * Returns daily sales revenue and volume for the last N days
 */
const getSalesTrends = async (days = 7) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  const sales = await Sale.aggregate([
    {
      $match: {
        status: 'COMPLETED',
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
        salesCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill in missing days so the chart is smooth
  const trendsMap = {};
  sales.forEach((s) => {
    trendsMap[s._id] = s;
  });

  const result = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    result.push({
      date: dateStr,
      revenue: trendsMap[dateStr] ? trendsMap[dateStr].revenue : 0,
      salesCount: trendsMap[dateStr] ? trendsMap[dateStr].salesCount : 0,
    });
  }

  return result;
};

/**
 * Returns top-selling products by quantity and revenue
 */
const getTopProducts = async (limit = 5) => {
  const topProducts = await SaleItem.aggregate([
    {
      $lookup: {
        from: 'sales',
        localField: 'sale',
        foreignField: '_id',
        as: 'saleDoc',
      },
    },
    { $unwind: '$saleDoc' },
    { $match: { 'saleDoc.status': 'COMPLETED' } },
    {
      $group: {
        _id: '$product',
        totalQuantitySold: { $sum: '$quantity' },
        totalRevenue: { $sum: '$totalPrice' },
      },
    },
    { $sort: { totalQuantitySold: -1 } },
    { $limit: Number(limit) },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDoc',
      },
    },
    { $unwind: '$productDoc' },
    {
      $project: {
        productId: '$_id',
        name: '$productDoc.name',
        sku: '$productDoc.sku',
        category: '$productDoc.category',
        totalQuantitySold: 1,
        totalRevenue: 1,
      },
    },
  ]);

  return topProducts;
};

/**
 * Returns category-wise sales revenue
 */
const getSalesByCategory = async () => {
  const result = await SaleItem.aggregate([
    {
      $lookup: {
        from: 'sales',
        localField: 'sale',
        foreignField: '_id',
        as: 'saleDoc',
      },
    },
    { $unwind: '$saleDoc' },
    { $match: { 'saleDoc.status': 'COMPLETED' } },
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'productDoc',
      },
    },
    { $unwind: '$productDoc' },
    {
      $group: {
        _id: '$productDoc.category',
        totalRevenue: { $sum: '$totalPrice' },
        totalItemsSold: { $sum: '$quantity' },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);

  return result.map((r) => ({
    category: r._id,
    revenue: r.totalRevenue,
    itemsSold: r.totalItemsSold,
  }));
};

module.exports = {
  getSummary,
  getSalesTrends,
  getTopProducts,
  getSalesByCategory,
};
