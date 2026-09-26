const inventoryService = require('../services/inventoryService');
const { successResponse } = require('../utils/response');

const getInventory = async (req, res, next) => {
  try {
    const inventory = await inventoryService.getInventory(req.query);
    return successResponse(res, 200, 'Inventory retrieved successfully', inventory);
  } catch (error) {
    next(error);
  }
};

const getInventoryById = async (req, res, next) => {
  try {
    const inventory = await inventoryService.getInventoryById(req.params.id);
    return successResponse(res, 200, 'Inventory record retrieved successfully', inventory);
  } catch (error) {
    next(error);
  }
};

const getInventoryByProduct = async (req, res, next) => {
  try {
    const inventory = await inventoryService.getInventoryByProductId(req.params.productId);
    return successResponse(res, 200, 'Product inventory retrieved successfully', inventory);
  } catch (error) {
    next(error);
  }
};

const getStockTransactions = async (req, res, next) => {
  try {
    const transactions = await inventoryService.getStockTransactions(req.query);
    return successResponse(res, 200, 'Stock transactions retrieved successfully', transactions);
  } catch (error) {
    next(error);
  }
};

const adjustStock = async (req, res, next) => {
  try {
    const result = await inventoryService.adjustStock(req.params.productId, req.body, req.user._id);
    return successResponse(res, 200, 'Stock adjusted successfully', result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  getInventoryById,
  getInventoryByProduct,
  getStockTransactions,
  adjustStock,
};
