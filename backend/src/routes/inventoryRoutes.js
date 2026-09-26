const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// All roles can check inventory counts
router.get('/', inventoryController.getInventory);
router.get('/transactions', authorize('ADMIN', 'MANAGER'), inventoryController.getStockTransactions);
router.get('/:id', inventoryController.getInventoryById);
router.get('/product/:productId', inventoryController.getInventoryByProduct);

// Admin and Manager can perform stock adjustments
router.post('/adjust/:productId', authorize('ADMIN', 'MANAGER'), inventoryController.adjustStock);

module.exports = router;
