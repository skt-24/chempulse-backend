const categoryService = require('../services/categoryService');
const { sendSuccess } = require('../utils/apiResponse');

const getCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getCategories();
    sendSuccess(res, 200, { categories });
  } catch (err) {
    next(err);
  }
};

const getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryBySlug(req.params.slug);
    sendSuccess(res, 200, { category });
  } catch (err) {
    next(err);
  }
};

const getCategoryArticles = async (req, res, next) => {
  try {
    const result = await categoryService.getCategoryArticles(req.params.slug, req.query);
    sendSuccess(res, 200, result);
  } catch (err) {
    next(err);
  }
};

const getCategoryHub = async (req, res, next) => {
  try {
    const hub = await categoryService.getCategoryHub(req.params.slug);
    sendSuccess(res, 200, { hub });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCategories,
  getCategoryBySlug,
  getCategoryArticles,
  getCategoryHub
};