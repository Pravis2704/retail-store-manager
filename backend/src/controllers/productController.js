const productService = require('../services/productService');
const { successResponse } = require('../utils/response');

const getProducts = async (req, res, next) => {
  try {
    const products = await productService.getProducts(req.query, req.user.role);
    return successResponse(res, 200, 'Products retrieved successfully', products);
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    return successResponse(res, 200, 'Product retrieved successfully', product);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body, req.user._id);
    return successResponse(res, 201, 'Product created and inventory initialized successfully', product);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return successResponse(res, 200, 'Product updated successfully', product);
  } catch (error) {
    next(error);
  }
};

const toggleProduct = async (req, res, next) => {
  try {
    const product = await productService.toggleProductStatus(req.params.id);
    return successResponse(res, 200, `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`, product);
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await productService.getCategories();
    return successResponse(res, 200, 'Categories retrieved successfully', categories);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProduct,
  getCategories,
};
