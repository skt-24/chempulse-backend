const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const ApiError = require('../utils/apiError');

const getUTCTodayBounds = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
};

const getTodayQuiz = async (userId = null) => {
  const { start, end } = getUTCTodayBounds();

  // 1. Fetch daily quiz
  let quiz = await Quiz.findOne({
    active: true,
    dateIndex: { $gte: start, $lte: end }
  })
    .populate('category', 'name slug')
    .populate('topic', 'name slug')
    .lean();

  // 2. Deterministic fallback if today's quiz hasn't been explicitly published
  if (!quiz) {
    const totalCount = await Quiz.countDocuments({ active: true });
    if (totalCount === 0) {
      return { quiz: null, hasAttempted: false };
    }

    const daysSinceEpoch = Math.floor(start.getTime() / (1000 * 60 * 60 * 24));
    const index = daysSinceEpoch % totalCount;

    quiz = await Quiz.findOne({ active: true })
      .skip(index)
      .populate('category', 'name slug')
      .populate('topic', 'name slug')
      .lean();
  }

  if (!quiz) {
    return { quiz: null, hasAttempted: false };
  }

  // Check if user has already completed this quiz
  let hasAttempted = false;
  let userAttempt = null;
  if (userId) {
    userAttempt = await QuizAttempt.findOne({ user: userId, quiz: quiz._id }).lean();
    hasAttempted = !!userAttempt;
  }

  // SECURITY CRITICAL RULE: Strip correct answers & explanations from question objects for unsubmitted quizzes
  const sanitizedQuestions = quiz.questions.map((q) => ({
    id: q._id,
    questionText: q.questionText,
    options: q.options
  }));

  return {
    quiz: {
      id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      difficulty: quiz.difficulty,
      category: quiz.category,
      topic: quiz.topic,
      questionsCount: sanitizedQuestions.length,
      questions: sanitizedQuestions
    },
    hasAttempted,
    previousAttempt: userAttempt
      ? {
          score: userAttempt.score,
          totalQuestions: userAttempt.totalQuestions,
          percentage: userAttempt.percentage,
          completedAt: userAttempt.createdAt
        }
      : null
  };
};

const submitQuiz = async (userId, quizId, userAnswers) => {
  // Explicitly fetch questions WITH correctOptionIndex and explanation
  const quiz = await Quiz.findOne({ _id: quizId, active: true }).select(
    '+questions.correctOptionIndex +questions.explanation'
  );

  if (!quiz) {
    throw new ApiError(404, 'Quiz not found', 'QUIZ_NOT_FOUND');
  }

  // Check if user has already submitted this quiz
  const existingAttempt = await QuizAttempt.findOne({ user: userId, quiz: quiz._id });
  if (existingAttempt) {
    throw new ApiError(409, 'You have already completed this quiz', 'ALREADY_SUBMITTED');
  }

  const questionMap = new Map(quiz.questions.map((q) => [q._id.toString(), q]));

  let score = 0;
  const processedAnswers = [];
  const detailedResults = [];

  for (const ans of userAnswers) {
    const question = questionMap.get(ans.questionId);
    if (!question) continue;

    const isCorrect = question.correctOptionIndex === ans.selectedOptionIndex;
    if (isCorrect) score++;

    processedAnswers.push({
      questionId: question._id,
      selectedOptionIndex: ans.selectedOptionIndex,
      isCorrect
    });

    detailedResults.push({
      questionId: question._id,
      questionText: question.questionText,
      options: question.options,
      selectedOptionIndex: ans.selectedOptionIndex,
      correctOptionIndex: question.correctOptionIndex,
      isCorrect,
      explanation: question.explanation
    });
  }

  const totalQuestions = quiz.questions.length;
  const percentage = Math.round((score / totalQuestions) * 100);

  const attempt = await QuizAttempt.create({
    user: userId,
    quiz: quiz._id,
    answers: processedAnswers,
    score,
    totalQuestions,
    percentage
  });

  return {
    attemptId: attempt._id,
    score,
    totalQuestions,
    percentage,
    detailedResults
  };
};

const getUserQuizHistory = async (userId, queryParams) => {
  const { page = 1, limit = 10 } = queryParams;
  const skip = (page - 1) * limit;

  const [attempts, total] = await Promise.all([
    QuizAttempt.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate({ path: 'quiz', select: 'title difficulty category', populate: { path: 'category', select: 'name slug' } })
      .lean(),
    QuizAttempt.countDocuments({ user: userId })
  ]);

  return {
    attempts: attempts.map((a) => ({
      id: a._id,
      quiz: a.quiz,
      score: a.score,
      totalQuestions: a.totalQuestions,
      percentage: a.percentage,
      completedAt: a.createdAt
    })),
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  };
};

module.exports = {
  getTodayQuiz,
  submitQuiz,
  getUserQuizHistory
};