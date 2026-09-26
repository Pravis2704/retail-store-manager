const dashboardService = require('../services/dashboardService');
const { successResponse } = require('../utils/response');

const getSummary = async (req, res, next) => {
  try {
    const summary = await dashboardService.getSummary();
    return successResponse(res, 200, 'Dashboard summary retrieved successfully', summary);
  } catch (error) {
    next(error);
  }
};

const getSalesTrends = async (req, res, next) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 7;
    const trends = await dashboardService.getSalesTrends(days);
    return successResponse(res, 200, 'Sales trends retrieved successfully', trends);
  } catch (error) {
    next(error);
  }
};

const getTopProducts = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const topProducts = await dashboardService.getTopProducts(limit);
    return successResponse(res, 200, 'Top products retrieved successfully', topProducts);
  } catch (error) {
    next(error);
  }
};

const getSalesByCategory = async (req, res, next) => {
  try {
    const categories = await dashboardService.getSalesByCategory();
    return successResponse(res, 200, 'Category sales retrieved successfully', categories);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  getSalesTrends,
  getTopProducts,
  getSalesByCategory,
};
