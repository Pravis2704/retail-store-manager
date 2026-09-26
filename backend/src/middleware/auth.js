const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/response');

/**
 * Protect routes by verifying JWT in Authorization header
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return errorResponse(res, 401, 'Authorization token required. Access denied.', 'AUTH_REQUIRED');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'retail_store_jwt_secret_key_2026_super_secure_token');
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return errorResponse(res, 401, 'User account associated with this token no longer exists.', 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      return errorResponse(res, 403, 'User account has been deactivated. Please contact an Administrator.', 'ACCOUNT_DEACTIVATED');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'Token expired. Please log in again.', 'TOKEN_EXPIRED');
    }
    return errorResponse(res, 401, 'Invalid authorization token.', 'INVALID_TOKEN');
  }
};

module.exports = {
  protect,
};
