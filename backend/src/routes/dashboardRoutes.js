const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/summary', dashboardController.getSummary);
router.get('/sales-trends', dashboardController.getSalesTrends);
router.get('/top-products', dashboardController.getTopProducts);
router.get('/sales-by-category', dashboardController.getSalesByCategory);

module.exports = router;
