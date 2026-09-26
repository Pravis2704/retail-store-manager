const reorderService = require('../services/reorderService');
const { successResponse } = require('../utils/response');

const getReorders = async (req, res, next) => {
  try {
    const reorders = await reorderService.getReorders(req.query);
    return successResponse(res, 200, 'Reorder requests retrieved successfully', reorders);
  } catch (error) {
    next(error);
  }
};

const getReorderById = async (req, res, next) => {
  try {
    const reorder = await reorderService.getReorderById(req.params.id);
    return successResponse(res, 200, 'Reorder details retrieved successfully', reorder);
  } catch (error) {
    next(error);
  }
};

const createReorder = async (req, res, next) => {
  try {
    const reorder = await reorderService.createReorder(req.body, req.user._id);
    return successResponse(res, 201, 'Reorder request raised successfully', reorder);
  } catch (error) {
    next(error);
  }
};

const approveReorder = async (req, res, next) => {
  try {
    const reorder = await reorderService.approveReorder(req.params.id, req.user._id);
    return successResponse(res, 200, 'Reorder request approved successfully', reorder);
  } catch (error) {
    next(error);
  }
};

const rejectReorder = async (req, res, next) => {
  try {
    const reorder = await reorderService.rejectReorder(req.params.id, req.body.reason, req.user._id);
    return successResponse(res, 200, 'Reorder request rejected successfully', reorder);
  } catch (error) {
    next(error);
  }
};

const receiveGoods = async (req, res, next) => {
  try {
    const reorder = await reorderService.receiveGoods(req.params.id, req.body, req.user._id);
    return successResponse(res, 200, 'Goods received and inventory replenished successfully', reorder);
  } catch (error) {
    next(error);
  }
};

const getSmartRecommendations = async (req, res, next) => {
  try {
    const recommendations = await reorderService.getSmartReorderRecommendations();
    return successResponse(res, 200, 'Smart replenishment recommendations generated successfully', recommendations);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReorders,
  getReorderById,
  createReorder,
  approveReorder,
  rejectReorder,
  receiveGoods,
  getSmartRecommendations,
};
