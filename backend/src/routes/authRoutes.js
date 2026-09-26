const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Public routes
router.post('/login', authController.login);

// Authenticated user route
router.get('/me', protect, authController.getMe);

// Admin-only user management routes
router.get('/users', protect, authorize('ADMIN'), authController.getUsers);
router.post('/users', protect, authorize('ADMIN'), authController.createUser);
router.patch('/users/:id/toggle', protect, authorize('ADMIN'), authController.toggleUser);

module.exports = router;
