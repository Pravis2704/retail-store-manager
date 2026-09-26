const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// Admin and Manager can view suppliers
router.get('/', authorize('ADMIN', 'MANAGER'), supplierController.getSuppliers);
router.get('/:id', authorize('ADMIN', 'MANAGER'), supplierController.getSupplierById);

// Admin only can mutate suppliers
router.post('/', authorize('ADMIN'), supplierController.createSupplier);
router.put('/:id', authorize('ADMIN'), supplierController.updateSupplier);
router.patch('/:id/toggle', authorize('ADMIN'), supplierController.toggleSupplier);

module.exports = router;
