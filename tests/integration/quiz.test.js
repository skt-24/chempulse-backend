const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let Quiz;
let User;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5010';
  process.env.CORS_ORIGIN = '*';
  process.env.JWT_SECRET = 'test_quiz_jwt_secret_123';
  process.env.JWT_REFRESH_SECRET = 'test_quiz_jwt_refresh_123';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = require('../../src/app');
  Quiz = require('../../src/models/Quiz');
  User = require('../../src/models/User');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('ChemPulse Daily Quiz Engine', () => {
  it('GET /api/quizzes/today - MUST NOT leak correct answers or explanations', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await Quiz.create({
      title: 'Organic Chemistry Basics',
      difficulty: 'easy',
      dateIndex: today,
      questions: [
        {
          questionText: 'What is the functional group of alcohols?',
          options: ['-OH', '-COOH', '-CHO', '-NH2'],
          correctOptionIndex: 0,
          explanation: 'Alcohols contain a hydroxyl (-OH) functional group.'
        }
      ]
    });

    const res = await request(app).get('/api/quizzes/today');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quiz).toBeDefined();

    const question = res.body.data.quiz.questions[0];
    expect(question.questionText).toBe('What is the functional group of alcohols?');
    expect(question.options).toEqual(['-OH', '-COOH', '-CHO', '-NH2']);

    // CRITICAL SECURITY ASSERTIONS
    expect(question.correctOptionIndex).toBeUndefined();
    expect(question.explanation).toBeUndefined();
  });

  it('POST /api/quizzes/:id/submit - should calculate score and return explanations post-submission', async () => {
    const user = await User.create({ name: 'Student', email: 'student@chempulse.io', passwordHash: 'Password123!' });
    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    const quiz = await Quiz.create({
      title: 'Chemical Bonds',
      difficulty: 'medium',
      questions: [
        {
          questionText: 'Which bond involves sharing electron pairs?',
          options: ['Ionic', 'Covalent', 'Metallic', 'Hydrogen'],
          correctOptionIndex: 1,
          explanation: 'Covalent bonds involve electron pair sharing.'
        }
      ]
    });

    const questionId = quiz.questions[0]._id.toString();

    const res = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: [{ questionId, selectedOptionIndex: 1 }]
      });

    expect(res.status).toBe(200);
    expect(res.body.data.score).toBe(1);
    expect(res.body.data.percentage).toBe(100);

    // Explanations & correct answers are provided ONLY post-submission
    expect(res.body.data.detailedResults[0].correctOptionIndex).toBe(1);
    expect(res.body.data.detailedResults[0].explanation).toBe('Covalent bonds involve electron pair sharing.');
  });

  it('POST /api/quizzes/:id/submit - should reject duplicate scoring attempts', async () => {
    const user = await User.create({ name: 'User Repeat', email: 'repeat@chempulse.io', passwordHash: 'Password123!' });
    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    const quiz = await Quiz.create({
      title: 'Thermodynamics',
      questions: [
        {
          questionText: 'First law of thermodynamics relates to?',
          options: ['Energy Conservation', 'Entropy', 'Absolute Zero'],
          correctOptionIndex: 0,
          explanation: 'Energy can neither be created nor destroyed.'
        }
      ]
    });

    const questionId = quiz.questions[0]._id.toString();

    // First attempt succeeds
    await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [{ questionId, selectedOptionIndex: 0 }] });

    // Second attempt fails
    const secondRes = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [{ questionId, selectedOptionIndex: 0 }] });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error.code).toBe('ALREADY_SUBMITTED');
  });
});