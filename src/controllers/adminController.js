const adminService = require('../services/adminService');
const Topic = require('../models/Topic');
const { sendSuccess } = require('../utils/apiResponse');

// ======================================================
// DASHBOARD
// ======================================================

const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();

    sendSuccess(res, 200, {
      stats
    });
  } catch (err) {
    next(err);
  }
};

// ======================================================
// ARTICLES
// ======================================================

const listArticles = async (req, res, next) => {
  try {
    const result = await adminService.listArticles(req.query);
    sendSuccess(res, 200, result);
  } catch (err) {
    next(err);
  }
};

const listTopics = async (req, res, next) => {
  try {
    const topics = await Topic.find({ active: true }).select('name slug').sort({ name: 1 });
    sendSuccess(res, 200, { topics });
  } catch (err) {
    next(err);
  }
};

const bulkCreateArticles = async (req, res, next) => {
  try {
    const records = Array.isArray(req.body?.articles) ? req.body.articles : [];
    if (!records.length || records.length > 500) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_BATCH_SIZE', message: 'Provide between 1 and 500 articles.' } });
    }
    const { validateAdminData } = require('../validators/adminValidator');
    const results = await Promise.all(records.map(async (record, index) => {
      try {
        const article = validateAdminData('article', record);
        const created = await adminService.createArticle(article, req.user._id);
        return { index, success: true, article: created };
      } catch (error) {
        return { index, success: false, title: record?.title || '', error: error.message };
      }
    }));
    const created = results.filter((item) => item.success).map((item) => item.article);
    const failed = results.filter((item) => !item.success);
    sendSuccess(res, 200, { results, created, failed, successCount: created.length, failureCount: failed.length });
  } catch (err) {
    next(err);
  }
};

const createArticle = async (req, res, next) => {
  try {
    const article = await adminService.createArticle(
      req.body,
      req.user._id
    );

    sendSuccess(res, 201, {
      article
    });
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

    sendSuccess(res, 200, {
      article
    });
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

// ======================================================
// CATEGORIES
// ======================================================

const createCategory = async (req, res, next) => {
  try {
    const category = await adminService.createCategory(
      req.body
    );

    sendSuccess(res, 201, {
      category
    });
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

    sendSuccess(res, 200, {
      category
    });
  } catch (err) {
    next(err);
  }
};

// ======================================================
// TOPICS
// ======================================================

const createTopic = async (req, res, next) => {
  try {
    const topic = await adminService.createTopic(
      req.body
    );

    sendSuccess(res, 201, {
      topic
    });
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

    sendSuccess(res, 200, {
      topic
    });
  } catch (err) {
    next(err);
  }
};

// ======================================================
// MOLECULES
// ======================================================

const createMolecule = async (req, res, next) => {
  try {
    const molecule = await adminService.createMolecule(
      req.body
    );

    sendSuccess(res, 201, {
      molecule
    });
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

    sendSuccess(res, 200, {
      molecule
    });
  } catch (err) {
    next(err);
  }
};

// ======================================================
// QUIZZES
// ======================================================

const createQuiz = async (req, res, next) => {
  try {
    const quiz = await adminService.createQuiz(
      req.body
    );

    sendSuccess(res, 201, {
      quiz
    });
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

    sendSuccess(res, 200, {
      quiz
    });
  } catch (err) {
    next(err);
  }
};

// ======================================================
// CATEGORY HUB
// ======================================================

const upsertCategoryHub = async (req, res, next) => {
  try {
    const hub = await adminService.upsertCategoryHub(
      req.body
    );

    sendSuccess(res, 200, {
      hub
    });
  } catch (err) {
    next(err);
  }
};

// ======================================================
// VINTAGE ARCHIVE
// ======================================================

const listVintage = async (req, res, next) => {
  try { sendSuccess(res, 200, { items: await adminService.listVintage(req.query) }); }
  catch (err) { next(err); }
};

const getVintageById = async (req, res, next) => {
  try { sendSuccess(res, 200, { item: await adminService.getVintageById(req.params.id) }); }
  catch (err) { next(err); }
};

const createVintage = async (req, res, next) => {
  try {
    const item = await adminService.createVintage(
      req.body
    );

    sendSuccess(res, 201, {
      item
    });
  } catch (err) {
    next(err);
  }
};

const updateVintage = async (req, res, next) => {
  try {
    const item = await adminService.updateVintage(
      req.params.id,
      req.body
    );

    sendSuccess(res, 200, {
      item
    });
  } catch (err) {
    next(err);
  }
};

const deleteVintage = async (req, res, next) => {
  try {
    await adminService.deleteVintage(
      req.params.id
    );

    sendSuccess(res, 200, {
      message: 'Vintage entry permanently deleted'
    });
  } catch (err) {
    next(err);
  }
};

const listMolecules = async (req, res, next) => {
  try { sendSuccess(res, 200, { molecules: await adminService.listMolecules(req.query) }); }
  catch (err) { next(err); }
};

const deleteMolecule = async (req, res, next) => {
  try { await adminService.deleteMolecule(req.params.id); sendSuccess(res, 200, { message: 'Molecule deleted' }); }
  catch (err) { next(err); }
};

const setMoleculeFeaturedDate = async (req, res, next) => {
  try { const molecule = await adminService.setMoleculeFeaturedDate(req.params.id, req.body.featuredDate); sendSuccess(res, 200, { molecule }); }
  catch (err) { next(err); }
};

module.exports = {
  getDashboardStats,
  listArticles,
  listTopics,
  bulkCreateArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  createCategory,
  updateCategory,
  createTopic,
  updateTopic,
  createMolecule,
  updateMolecule,
  listMolecules,
  deleteMolecule,
  setMoleculeFeaturedDate,
  createQuiz,
  updateQuiz,
  upsertCategoryHub,
  listVintage,
  getVintageById,
  createVintage,
  updateVintage,
  deleteVintage
};
