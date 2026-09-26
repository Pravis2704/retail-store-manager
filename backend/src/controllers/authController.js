const authService = require('../services/authService');
const { successResponse } = require('../utils/response');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return successResponse(res, 200, 'Login successful', result);
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res) => {
  return successResponse(res, 200, 'Current user profile', req.user);
};

const createUser = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body);
    return successResponse(res, 201, 'User registered successfully', user);
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const users = await authService.getAllUsers();
    return successResponse(res, 200, 'Users retrieved successfully', users);
  } catch (error) {
    next(error);
  }
};

const toggleUser = async (req, res, next) => {
  try {
    const user = await authService.toggleUserStatus(req.params.id, req.user._id);
    return successResponse(res, 200, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, user);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  createUser,
  getUsers,
  toggleUser,
};
