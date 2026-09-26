const reportService = require('../services/reportService');
const { successResponse } = require('../utils/response');

const getSalesReport = async (req, res, next) => {
  try {
    const report = await reportService.getSalesReport(req.query);
    return successResponse(res, 200, 'Sales report generated successfully', report);
  } catch (error) {
    next(error);
  }
};

const getInventoryReport = async (req, res, next) => {
  try {
    const report = await reportService.getInventoryReport(req.query);
    return successResponse(res, 200, 'Inventory report generated successfully', report);
  } catch (error) {
    next(error);
  }
};

const getStockMovementReport = async (req, res, next) => {
  try {
    const report = await reportService.getStockMovementReport(req.query);
    return successResponse(res, 200, 'Stock movement report generated successfully', report);
  } catch (error) {
    next(error);
  }
};

const getReorderReport = async (req, res, next) => {
  try {
    const report = await reportService.getReorderReport(req.query);
    return successResponse(res, 200, 'Reorder report generated successfully', report);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSalesReport,
  getInventoryReport,
  getStockMovementReport,
  getReorderReport,
};
