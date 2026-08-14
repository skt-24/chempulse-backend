const express = require('express');

const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const { validateAdminPayload } = require('../validators/adminValidator');

const router = express.Router();

// ======================================================
// ADMIN AUTHENTICATION
// ======================================================

router.use(protect);
router.use(authorize('admin'));

// ======================================================
// DASHBOARD
// ======================================================

router.get(
  '/dashboard/stats',
  adminController.getDashboardStats
);

// ======================================================
// ARTICLES
// ======================================================

router.post(
  '/articles',
  validateAdminPayload('article'),
  adminController.createArticle
);

router.put(
  '/articles/:id',
  validateAdminPayload('article'),
  adminController.updateArticle
);

router.delete(
  '/articles/:id',
  adminController.deleteArticle
);

// ======================================================
// CATEGORIES
// ======================================================

router.post(
  '/categories',
  validateAdminPayload('category'),
  adminController.createCategory
);

router.put(
  '/categories/:id',
  validateAdminPayload('category'),
  adminController.updateCategory
);

// ======================================================
// TOPICS
// ======================================================

router.post(
  '/topics',
  validateAdminPayload('topic'),
  adminController.createTopic
);

router.put(
  '/topics/:id',
  validateAdminPayload('topic'),
  adminController.updateTopic
);

// ======================================================
// MOLECULES
// ======================================================

router.post(
  '/molecules',
  validateAdminPayload('molecule'),
  adminController.createMolecule
);

router.put(
  '/molecules/:id',
  validateAdminPayload('molecule'),
  adminController.updateMolecule
);

// ======================================================
// QUIZZES
// ======================================================

router.post(
  '/quizzes',
  validateAdminPayload('quiz'),
  adminController.createQuiz
);

router.put(
  '/quizzes/:id',
  validateAdminPayload('quiz'),
  adminController.updateQuiz
);

// ======================================================
// CATEGORY HUB
// ======================================================

router.post(
  '/hubs',
  validateAdminPayload('hub'),
  adminController.upsertCategoryHub
);

module.exports = router;
// ======================================================
// VINTAGE ARCHIVE
// ======================================================

router.post(
  '/vintage',
  validateAdminPayload('vintage'),
  adminController.createVintage
);

router.put(
  '/vintage/:id',
  validateAdminPayload('vintage'),
  adminController.updateVintage
);

router.delete(
  '/vintage/:id',
  adminController.deleteVintage
);