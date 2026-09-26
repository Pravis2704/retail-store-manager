const salesService = require('../services/salesService');
const { successResponse } = require('../utils/response');

const createSale = async (req, res, next) => {
  try {
    const sale = await salesService.createSale(req.body, req.user._id);
    return successResponse(res, 201, 'Sale completed successfully', sale);
  } catch (error) {
    next(error);
  }
};

const getSales = async (req, res, next) => {
  try {
    const sales = await salesService.getSales(req.query, req.user.role, req.user._id);
    return successResponse(res, 200, 'Sales retrieved successfully', sales);
  } catch (error) {
    next(error);
  }
};

const getSaleById = async (req, res, next) => {
  try {
    const sale = await salesService.getSaleById(req.params.id);
    return successResponse(res, 200, 'Sale details retrieved successfully', sale);
  } catch (error) {
    next(error);
  }
};

const cancelSale = async (req, res, next) => {
  try {
    const sale = await salesService.cancelSale(req.params.id, req.body.reason, req.user._id);
    return successResponse(res, 200, 'Sale cancelled and inventory restored successfully', sale);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSale,
  getSales,
  getSaleById,
  cancelSale,
};
