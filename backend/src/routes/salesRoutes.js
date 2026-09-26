const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// All authenticated roles can list and create sales
router.get('/', salesController.getSales);
router.get('/:id', salesController.getSaleById);
router.post('/', salesController.createSale);

// Only Admin and Manager can cancel sales
router.patch('/:id/cancel', authorize('ADMIN', 'MANAGER'), salesController.cancelSale);

module.exports = router;
