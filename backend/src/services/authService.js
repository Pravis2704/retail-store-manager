const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'retail_store_jwt_secret_key_2026_super_secure_token', {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
};

const login = async (email, password) => {
  if (!email || !password) {
    const error = new Error('Please provide email and password');
    error.statusCode = 400;
    error.errorCode = 'MISSING_CREDENTIALS';
    throw error;
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    error.errorCode = 'INVALID_CREDENTIALS';
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Your account is deactivated. Contact an administrator.');
    error.statusCode = 403;
    error.errorCode = 'ACCOUNT_DEACTIVATED';
    throw error;
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    error.errorCode = 'INVALID_CREDENTIALS';
    throw error;
  }

  const token = generateToken(user._id);

  const userObj = user.toObject();
  delete userObj.passwordHash;

  return {
    user: userObj,
    token,
  };
};

const registerUser = async (userData) => {
  const { name, email, password, role } = userData;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const error = new Error('A user with this email already exists');
    error.statusCode = 409;
    error.errorCode = 'EMAIL_ALREADY_EXISTS';
    throw error;
  }

  const passwordHash = await User.hashPassword(password || 'Retail@123');

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: role || 'SALES_STAFF',
    isActive: true,
  });

  const userObj = user.toObject();
  delete userObj.passwordHash;
  return userObj;
};

const getAllUsers = async () => {
  return await User.find().select('-passwordHash').sort({ createdAt: -1 });
};

const toggleUserStatus = async (userId, currentUserId) => {
  if (userId.toString() === currentUserId.toString()) {
    const error = new Error('You cannot deactivate your own account');
    error.statusCode = 400;
    error.errorCode = 'CANNOT_DEACTIVATE_SELF';
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.errorCode = 'USER_NOT_FOUND';
    throw error;
  }

  user.isActive = !user.isActive;
  await user.save();

  return await User.findById(userId).select('-passwordHash');
};

module.exports = {
  login,
  registerUser,
  getAllUsers,
  toggleUserStatus,
};
