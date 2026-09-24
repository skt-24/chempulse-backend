const ingestionService = require('../services/ingestionService');
const { sendSuccess } = require('../utils/apiResponse');

const registerSource = async (req, res, next) => {
  try {
    const source = await ingestionService.registerSource(req.body);
    sendSuccess(res, 201, { source });
  } catch (err) {
    next(err);
  }
};

const triggerIngestion = async (req, res, next) => {
  try {
    const result = await ingestionService.runIngestionForSource(req.params.sourceId);
    sendSuccess(res, 200, result);
  } catch (err) {
    next(err);
  }
};

const getReviewQueue = async (req, res, next) => {
  try {
    const result = await ingestionService.getReviewQueue(req.query);
    sendSuccess(res, 200, result);
  } catch (err) {
    next(err);
  }
};

const reviewArticle = async (req, res, next) => {
  try {
    const { action } = req.body;
    const article = await ingestionService.reviewIngestedArticle(req.params.articleId, action, req.user._id);
    sendSuccess(res, 200, { article });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerSource,
  triggerIngestion,
  getReviewQueue,
  reviewArticle
};