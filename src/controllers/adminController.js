const adminService = require('../services/adminService');
const { sendSuccess } = require('../utils/apiResponse');

// ==================== DASHBOARD ====================

const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    sendSuccess(res, 200, { stats });
  } catch (err) {
    next(err);
  }
};

// ==================== ARTICLES ====================

const createArticle = async (req, res, next) => {
  try {
    const article = await adminService.createArticle(req.body, req.user._id);
    sendSuccess(res, 201, { article });
  } catch (err) {
    next(err);
  }
};

const updateArticle = async (req, res, next) => {
  try {
    const article = await adminService.updateArticle(
      req.params.id,
      req.body,
      req.user._id
    );

    sendSuccess(res, 200, { article });
  } catch (err) {
    next(err);
  }
};

const deleteArticle = async (req, res, next) => {
  try {
    await adminService.deleteArticle(req.params.id);

    sendSuccess(res, 200, {
      message: 'Article permanently deleted'
    });
  } catch (err) {
    next(err);
  }
};

// ==================== CATEGORIES ====================

const createCategory = async (req, res, next) => {
  try {
    const category = await adminService.createCategory(req.body);

    sendSuccess(res, 201, { category });
  } catch (err) {
    next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await adminService.updateCategory(
      req.params.id,
      req.body
    );

    sendSuccess(res, 200, { category });
  } catch (err) {
    next(err);
  }
};

// ==================== TOPICS ====================

const createTopic = async (req, res, next) => {
  try {
    const topic = await adminService.createTopic(req.body);

    sendSuccess(res, 201, { topic });
  } catch (err) {
    next(err);
  }
};

const updateTopic = async (req, res, next) => {
  try {
    const topic = await adminService.updateTopic(
      req.params.id,
      req.body
    );

    sendSuccess(res, 200, { topic });
  } catch (err) {
    next(err);
  }
};

// ==================== MOLECULES ====================

const createMolecule = async (req, res, next) => {
  try {
    const molecule = await adminService.createMolecule(req.body);

    sendSuccess(res, 201, { molecule });
  } catch (err) {
    next(err);
  }
};

const updateMolecule = async (req, res, next) => {
  try {
    const molecule = await adminService.updateMolecule(
      req.params.id,
      req.body
    );

    sendSuccess(res, 200, { molecule });
  } catch (err) {
    next(err);
  }
};

// ==================== QUIZZES ====================

const createQuiz = async (req, res, next) => {
  try {
    const quiz = await adminService.createQuiz(req.body);

    sendSuccess(res, 201, { quiz });
  } catch (err) {
    next(err);
  }
};

const updateQuiz = async (req, res, next) => {
  try {
    const quiz = await adminService.updateQuiz(
      req.params.id,
      req.body
    );

    sendSuccess(res, 200, { quiz });
  } catch (err) {
    next(err);
  }
};

// ==================== HUB CONFIGURATION ====================

const upsertCategoryHub = async (req, res, next) => {
  try {
    const hub = await adminService.upsertCategoryHub(req.body);

    sendSuccess(res, 200, { hub });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  // Dashboard
  getDashboardStats,

  // Articles
  createArticle,
  updateArticle,
  deleteArticle,

  // Categories
  createCategory,
  updateCategory,

  // Topics
  createTopic,
  updateTopic,

  // Molecules
  createMolecule,
  updateMolecule,

  // Quizzes
  createQuiz,
  updateQuiz,

  // Hub
  upsertCategoryHub
};