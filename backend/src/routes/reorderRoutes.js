const express = require('express');
const router = express.Router();
const reorderController = require('../controllers/reorderController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// Only Admin and Manager can access the reorder workflow
router.use(authorize('ADMIN', 'MANAGER'));

router.get('/', reorderController.getReorders);
router.get('/ai-recommendations', reorderController.getSmartRecommendations);
router.get('/:id', reorderController.getReorderById);
router.post('/', reorderController.createReorder);
router.patch('/:id/approve', reorderController.approveReorder);
router.patch('/:id/reject', reorderController.rejectReorder);
router.patch('/:id/receive', reorderController.receiveGoods);

module.exports = router;
