/**
 * Standard API response helper functions
 */

const successResponse = (res, statusCode = 200, message = 'Success', data = null, meta = null) => {
  const response = {
    success: true,
    message,
    ...(data !== null && { data }),
    ...(meta !== null && { meta }),
  };
  return res.status(statusCode).json(response);
};

const errorResponse = (res, statusCode = 500, message = 'An error occurred', errorCode = 'SERVER_ERROR', errors = null) => {
  const response = {
    success: false,
    message,
    errorCode,
    ...(errors !== null && { errors }),
  };
  return res.status(statusCode).json(response);
};

module.exports = {
  successResponse,
  errorResponse,
};
