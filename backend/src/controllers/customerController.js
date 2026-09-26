const customerService = require('../services/customerService');
const { successResponse } = require('../utils/response');

const getCustomers = async (req, res, next) => {
  try {
    const customers = await customerService.getCustomers(req.query);
    return successResponse(res, 200, 'Customers retrieved successfully', customers);
  } catch (error) {
    next(error);
  }
};

const getCustomerById = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    return successResponse(res, 200, 'Customer retrieved successfully', customer);
  } catch (error) {
    next(error);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    return successResponse(res, 201, 'Customer created successfully', customer);
  } catch (error) {
    next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    return successResponse(res, 200, 'Customer updated successfully', customer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
};
