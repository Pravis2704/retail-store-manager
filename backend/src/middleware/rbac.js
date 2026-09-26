const { errorResponse } = require('../utils/response');

/**
 * Role-Based Access Control Middleware
 * Restricts access to specific roles
 * @param  {...string} roles Allowed roles ('ADMIN', 'MANAGER', 'SALES_STAFF')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required before checking permissions.', 'AUTH_REQUIRED');
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Access denied: Your role '${req.user.role}' is not authorized to access this resource. Allowed roles: ${roles.join(', ')}.`,
        'FORBIDDEN_ROLE'
      );
    }

    next();
  };
};

module.exports = {
  authorize,
};
