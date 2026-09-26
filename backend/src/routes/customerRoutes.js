const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// All roles can view, search, and create customers
router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', customerController.createCustomer);

// Admin and Manager can update customer records
router.put('/:id', authorize('ADMIN', 'MANAGER'), customerController.updateCustomer);

module.exports = router;
