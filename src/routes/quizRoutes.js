const express = require('express');
const quizController = require('../controllers/quizController');
const { validateSubmitQuiz } = require('../validators/quizValidator');
const { protect, optionalProtect } = require('../middleware/auth');

const router = express.Router();

router.get('/today', optionalProtect, quizController.getTodayQuiz);
router.post('/:id/submit', protect, validateSubmitQuiz, quizController.submitQuiz);
router.get('/history', protect, quizController.getHistory);

module.exports = router;