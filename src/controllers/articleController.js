const articleService = require('../services/articleService');
const { sendSuccess } = require('../utils/apiResponse');

const getArticles = async (req, res, next) => {
  try {
    const result = await articleService.getArticles(req.query);
    sendSuccess(res, 200, result);
  } catch (err) {
    next(err);
  }
};

const getArticleBySlug = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : null;
    const article = await articleService.getArticleBySlug(req.params.slug, userId);
    sendSuccess(res, 200, { article });
  } catch (err) {
    next(err);
  }
};

const getFeaturedArticles = async (req, res, next) => {
  try {
    const limit = req.query.limit || 5;
    const articles = await articleService.getFeaturedArticles(limit);
    sendSuccess(res, 200, { articles });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getArticles,
  getArticleBySlug,
  getFeaturedArticles
};