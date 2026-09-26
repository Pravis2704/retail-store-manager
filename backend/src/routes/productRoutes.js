const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// All roles can list and view products (Sales staff automatically restricted to active)
router.get('/categories', productController.getCategories);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

// Admin only can create, update, or toggle products
router.post('/', authorize('ADMIN'), productController.createProduct);
router.put('/:id', authorize('ADMIN'), productController.updateProduct);
router.patch('/:id/toggle', authorize('ADMIN'), productController.toggleProduct);

module.exports = router;
