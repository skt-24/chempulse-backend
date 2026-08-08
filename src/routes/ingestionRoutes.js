const express = require('express');
const ingestionController = require('../controllers/ingestionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All ingestion administration endpoints require authentication and admin/editor privileges
router.use(protect);
router.use(authorize('admin', 'editor'));

router.post('/sources', authorize('admin'), ingestionController.registerSource);
router.post('/sources/:sourceId/run', ingestionController.triggerIngestion);
router.get('/review-queue', ingestionController.getReviewQueue);
router.patch('/review-queue/:articleId', ingestionController.reviewArticle);

module.exports = router;