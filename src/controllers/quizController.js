const quizService = require('../services/quizService');
const { sendSuccess } = require('../utils/apiResponse');

const getTodayQuiz = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : null;
    const result = await quizService.getTodayQuiz(userId);
    sendSuccess(res, 200, result);
  } catch (err) {
    next(err);
  }
};

const submitQuiz = async (req, res, next) => {
  try {
    const result = await quizService.submitQuiz(
      req.user._id,
      req.params.id,
      req.body.answers
    );
    sendSuccess(res, 200, result);
  } catch (err) {
    next(err);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const result = await quizService.getUserQuizHistory(req.user._id, req.query);
    sendSuccess(res, 200, result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTodayQuiz,
  submitQuiz,
  getHistory
};