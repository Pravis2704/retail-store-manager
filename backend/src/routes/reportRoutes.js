const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// Only Admin and Manager can view reports
router.use(authorize('ADMIN', 'MANAGER'));

router.get('/sales', reportController.getSalesReport);
router.get('/inventory', reportController.getInventoryReport);
router.get('/stock-movements', reportController.getStockMovementReport);
router.get('/reorders', reportController.getReorderReport);

module.exports = router;
