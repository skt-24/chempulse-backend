const express = require('express');
const adminController = require('../controllers/adminController');
const { validateAdminPayload } = require('../validators/adminValidator');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All administrative routes require authentication and at least 'editor' role
router.use(protect);
router.use(authorize('editor', 'admin'));
router.get("/dashboard", adminController.getDashboardStats);

// --- ARTICLES ---
router.post('/articles', validateAdminPayload('article'), adminController.createArticle);
router.patch('/articles/:id', validateAdminPayload('article'), adminController.updateArticle);
router.delete('/articles/:id', authorize('admin'), adminController.deleteArticle); // Admin role required for hard deletion

// --- CATEGORIES ---
router.post('/categories', validateAdminPayload('category'), adminController.createCategory);
router.patch('/categories/:id', validateAdminPayload('category'), adminController.updateCategory);

// --- TOPICS ---
router.post('/topics', validateAdminPayload('topic'), adminController.createTopic);
router.patch('/topics/:id', validateAdminPayload('topic'), adminController.updateTopic);

// --- MOLECULES ---
router.post('/molecules', validateAdminPayload('molecule'), adminController.createMolecule);
router.patch('/molecules/:id', validateAdminPayload('molecule'), adminController.updateMolecule);

// --- QUIZZES ---
router.post('/quizzes', validateAdminPayload('quiz'), adminController.createQuiz);
router.patch('/quizzes/:id', validateAdminPayload('quiz'), adminController.updateQuiz);

// --- SPECIALIZED HUB CONFIG ---
router.post('/hubs', authorize('admin'), validateAdminPayload('hub'), adminController.upsertCategoryHub);

module.exports = router;