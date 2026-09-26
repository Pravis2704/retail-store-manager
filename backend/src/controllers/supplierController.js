const supplierService = require('../services/supplierService');
const { successResponse } = require('../utils/response');

const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await supplierService.getSuppliers(req.query);
    return successResponse(res, 200, 'Suppliers retrieved successfully', suppliers);
  } catch (error) {
    next(error);
  }
};

const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await supplierService.getSupplierById(req.params.id);
    return successResponse(res, 200, 'Supplier retrieved successfully', supplier);
  } catch (error) {
    next(error);
  }
};

const createSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.createSupplier(req.body);
    return successResponse(res, 201, 'Supplier created successfully', supplier);
  } catch (error) {
    next(error);
  }
};

const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.updateSupplier(req.params.id, req.body);
    return successResponse(res, 200, 'Supplier updated successfully', supplier);
  } catch (error) {
    next(error);
  }
};

const toggleSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.toggleSupplierStatus(req.params.id);
    return successResponse(res, 200, `Supplier marked as ${supplier.status}`, supplier);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  toggleSupplier,
};
