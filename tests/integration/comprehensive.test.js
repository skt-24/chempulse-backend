const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;

// Models
let User;
let Category;
let Topic;
let Article;
let Molecule;
let Bookmark;
let Notification;
let Quiz;
let CategoryHub;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5016';
  process.env.CORS_ORIGIN = '*';
  process.env.JWT_SECRET = 'comprehensive_jwt_secret_999';
  process.env.JWT_REFRESH_SECRET = 'comprehensive_refresh_secret_999';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = require('../../src/app');
  User = require('../../src/models/User');
  Category = require('../../src/models/Category');
  Topic = require('../../src/models/Topic');
  Article = require('../../src/models/Article');
  Molecule = require('../../src/models/Molecule');
  Bookmark = require('../../src/models/Bookmark');
  Notification = require('../../src/models/Notification');
  Quiz = require('../../src/models/Quiz');
  CategoryHub = require('../../src/models/CategoryHub');
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

describe('ChemPulse Comprehensive Backend Validation Suite', () => {
  // --- 1. AUTHENTICATION & USER MANAGEMENT ---
  describe('Authentication Lifecycle', () => {
    const testUser = {
      name: 'Niels Bohr',
      email: 'niels.bohr@chempulse.io',
      password: 'QuantumPassword123!'
    };

    it('Signup, Login, Refresh Rotation, Me, and Logout flow', async () => {
      // 1. Signup
      const signupRes = await request(app).post('/api/auth/signup').send(testUser);
      expect(signupRes.status).toBe(201);
      expect(signupRes.body.data.user.email).toBe(testUser.email);
      const refreshToken = signupRes.body.data.refreshToken;

      // 2. Refresh Token Rotation
      const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data).toHaveProperty('accessToken');
      const newAccessToken = refreshRes.body.data.accessToken;

      // 3. GET /api/auth/me
      const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${newAccessToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.email).toBe(testUser.email);

      // 4. Logout
      const logoutRes = await request(app).post('/api/auth/logout').send({ refreshToken });
      expect(logoutRes.status).toBe(200);
    });

    it('Password Recovery - Request reset token and perform reset', async () => {
      await request(app).post('/api/auth/signup').send(testUser);

      const forgotRes = await request(app).post('/api/auth/forgot-password').send({ email: testUser.email });
      expect(forgotRes.status).toBe(200);

      const dbUser = await User.findOne({ email: testUser.email }).select('+resetPasswordToken');
      const rawToken = dbUser.createPasswordResetToken();
      await dbUser.save();

      const resetRes = await request(app).post('/api/auth/reset-password').send({
        token: rawToken,
        newPassword: 'BrandNewPassword123!'
      });
      expect(resetRes.status).toBe(200);

      const loginRes = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: 'BrandNewPassword123!'
      });
      expect(loginRes.status).toBe(200);
    });
  });

  // --- 2. HOME, ARTICLES, CATEGORIES & HUBS ---
  describe('Content Engines & Specialized Landing Pages', () => {
    it('Home feed, Article listing, Article detail, Categories and Specialized Hub', async () => {
      const category = await Category.create({ name: 'Fuel & Energy', slug: 'fuel-and-energy' });
      const topic = await Topic.create({ name: 'Hydrogen Transport', slug: 'hydrogen-transport', isTrending: true });

      const publishedArticle = await Article.create({
        title: 'Hydrogen Fuel Cell Innovations',
        slug: 'hydrogen-fuel-cell-innovations',
        excerpt: 'Breakthrough in zero-emission transport.',
        content: 'Full article body on hydrogen fuel cell catalytic reactions...',
        author: { name: 'Dr. Energy' },
        category: category._id,
        topics: [topic._id],
        status: 'published',
        publishedAt: new Date()
      });

      // Draft Article (Must NOT be exposed)
      await Article.create({
        title: 'Secret Fuel Research',
        slug: 'secret-fuel-research',
        excerpt: 'Draft summary...',
        content: 'Draft content...',
        author: { name: 'Dr. Secret' },
        category: category._id,
        status: 'draft'
      });

      await CategoryHub.create({
        category: category._id,
        heroTitle: 'Fuel & Energy Hub',
        heroDescription: 'Hero description for fuel innovation.',
        statistics: [{ label: 'Capacity', value: '500', unit: 'MW' }],
        subtopics: [{ name: 'Hydrogen', slug: 'hydrogen' }],
        featuredArticles: [publishedArticle._id]
      });

      // GET /api/home
      const homeRes = await request(app).get('/api/home');
      expect(homeRes.status).toBe(200);
      expect(homeRes.body.data.headlines.length).toBe(1);
      expect(homeRes.body.data.headlines[0].title).toBe('Hydrogen Fuel Cell Innovations');

      // GET /api/articles (Public list excludes drafts)
      const articlesRes = await request(app).get('/api/articles');
      expect(articlesRes.status).toBe(200);
      expect(articlesRes.body.data.articles.length).toBe(1);

      // GET /api/categories/:slug/hub
      const hubRes = await request(app).get(`/api/categories/${category.slug}/hub`);
      expect(hubRes.status).toBe(200);
      expect(hubRes.body.data.hub.heroTitle).toBe('Fuel & Energy Hub');
    });
  });

  // --- 3. MOLECULES & MOTD ---
  describe('Molecule Discovery & MOTD Engine', () => {
    it('Molecule of the day determinism and detail lookup', async () => {
      await Molecule.create({
        name: 'Ethanol',
        slug: 'ethanol',
        formula: 'C2H6O',
        molarMass: 46.07,
        description: 'Biofuel component'
      });

      const motdRes = await request(app).get('/api/molecules/today');
      expect(motdRes.status).toBe(200);
      expect(motdRes.body.data.molecule.slug).toBe('ethanol');

      const detailRes = await request(app).get('/api/molecules/ethanol');
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.molecule.formula).toBe('C2H6O');
    });
  });

  // --- 4. BOOKMARKS, NOTIFICATIONS & PROFILE ---
  describe('Interactive User Features', () => {
    it('Bookmarks, Notifications, and Profile Management', async () => {
      const user = await User.create({ name: 'User Features', email: 'user.feat@chempulse.io', passwordHash: 'Password123!' });
      const token = require('../../src/utils/tokens').generateAccessToken(user._id);

      const category = await Category.create({ name: 'Biochem', slug: 'biochem' });
      const article = await Article.create({
        title: 'DNA Repair Mechanisms',
        slug: 'dna-repair-mechanisms',
        excerpt: 'Excerpt...',
        content: 'Content...',
        author: { name: 'Dr. Bio' },
        category: category._id,
        status: 'published'
      });

      // 1. Add Bookmark
      const bookmarkRes = await request(app)
        .post(`/api/bookmarks/articles/${article._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(bookmarkRes.status).toBe(201);

      // 2. Check Article Detail for isBookmarked: true
      const articleDetailRes = await request(app)
        .get(`/api/articles/${article.slug}`)
        .set('Authorization', `Bearer ${token}`);
      expect(articleDetailRes.body.data.article.isBookmarked).toBe(true);

      // 3. Notification Read State Mutation
      const notif = await Notification.create({
        user: user._id,
        type: 'research',
        title: 'New Research Alert',
        message: 'New paper published.',
        isRead: false
      });

      const readRes = await request(app)
        .patch(`/api/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${token}`);
      expect(readRes.status).toBe(200);
      expect(readRes.body.data.isRead).toBe(true);

      // 4. Profile Update
      const profileRes = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Niels Bohr',
          notificationPreferences: { dailyAlerts: false }
        });
      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.user.name).toBe('Updated Niels Bohr');
    });
  });

  // --- 5. QUIZZES & ANTI-LEAK SECURITY ---
  describe('Daily Quiz Security & Submission', () => {
    it('Quiz today MUST NOT leak answers; evaluates score on submit', async () => {
      const user = await User.create({ name: 'Quiz User', email: 'quiz@chempulse.io', passwordHash: 'Password123!' });
      const token = require('../../src/utils/tokens').generateAccessToken(user._id);

      const quiz = await Quiz.create({
        title: 'Organic Chemistry Quiz',
        questions: [
          {
            questionText: 'Which alkane has 1 carbon atom?',
            options: ['Methane', 'Ethane', 'Propane', 'Butane'],
            correctOptionIndex: 0,
            explanation: 'Methane (CH4) contains 1 carbon atom.'
          }
        ]
      });

      // 1. Fetch Today's Quiz (Answer Leak Prevention Assertion)
      const quizRes = await request(app).get('/api/quizzes/today');
      expect(quizRes.status).toBe(200);
      const question = quizRes.body.data.quiz.questions[0];
      expect(question.correctOptionIndex).toBeUndefined();
      expect(question.explanation).toBeUndefined();

      // 2. Submit Answers
      const submitRes = await request(app)
        .post(`/api/quizzes/${quiz._id}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          answers: [{ questionId: quiz.questions[0]._id.toString(), selectedOptionIndex: 0 }]
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.score).toBe(1);
      expect(submitRes.body.data.detailedResults[0].explanation).toBe('Methane (CH4) contains 1 carbon atom.');
    });
  });

  // --- 6. ADMIN RBAC & SECURITY EDGE CASES ---
  describe('RBAC & Security Boundaries', () => {
    it('Denies normal users access to /api/admin; prevents IDOR and handles CastErrors', async () => {
      const normalUser = await User.create({ name: 'User Normal', email: 'normal@chempulse.io', passwordHash: 'Password123!', roles: ['user'] });
      const adminUser = await User.create({ name: 'User Admin', email: 'admin.role@chempulse.io', passwordHash: 'Password123!', roles: ['admin'] });

      const normalToken = require('../../src/utils/tokens').generateAccessToken(normalUser._id, normalUser.roles);
      const adminToken = require('../../src/utils/tokens').generateAccessToken(adminUser._id, adminUser.roles);

      // 1. RBAC Restriction
      const rbacRes = await request(app)
        .post('/api/admin/articles')
        .set('Authorization', `Bearer ${normalToken}`)
        .send({ title: 'Hacked Article' });
      expect(rbacRes.status).toBe(403);

      // 2. Admin Success
      const category = await Category.create({ name: 'Admin Cat', slug: 'admin-cat' });
      const adminCreateRes = await request(app)
        .post('/api/admin/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Created Article',
          excerpt: 'Excerpt...',
          content: 'Content...',
          author: { name: 'Admin' },
          category: category._id.toString()
        });
      expect(adminCreateRes.status).toBe(201);

      // 3. IDOR Protection (User 1 cannot delete User 2's notification)
      const notifUser2 = await Notification.create({ user: adminUser._id, type: 'system', title: 'Private', message: 'Secret' });
      const idorRes = await request(app)
        .delete(`/api/notifications/${notifUser2._id}`)
        .set('Authorization', `Bearer ${normalToken}`);
      expect(idorRes.status).toBe(404);

      // 4. Invalid ObjectId CastError Handler
      const castRes = await request(app)
        .get('/api/articles/invalid-object-id-123');
      expect(castRes.status).toBe(404);
    });
  });
});