const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let Category;
let Topic;
let Article;
let Molecule;
let User;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5002';
  process.env.CORS_ORIGIN = '*';
  process.env.JWT_SECRET = 'test_home_jwt_secret_123';
  process.env.JWT_REFRESH_SECRET = 'test_home_jwt_refresh_123';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = require('../../src/app');
  Category = require('../../src/models/Category');
  Topic = require('../../src/models/Topic');
  Article = require('../../src/models/Article');
  Molecule = require('../../src/models/Molecule');
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

describe('GET /api/home Feed API', () => {
  it('should return a complete home feed for anonymous users', async () => {
    const category = await Category.create({ name: 'Physical Chemistry', slug: 'physical-chem' });
    
    await Topic.create({ name: 'Nanotechnology', slug: 'nanotech', isTrending: true, trendingScore: 90 });
    
    await Article.create({
      title: 'Quantum Dots in Solar Energy',
      slug: 'quantum-dots-solar',
      excerpt: 'Card-level excerpt about quantum dots...',
      content: 'Massive full article body text that should NOT be returned on home screen feed...',
      author: { name: 'Dr. Quantum' },
      category: category._id,
      status: 'published',
      publishedAt: new Date()
    });

    await Molecule.create({
      name: 'Benzene',
      slug: 'benzene',
      formula: 'C6H6',
      molarMass: 78.11,
      description: 'Aromatic hydrocarbon'
    });

    const res = await request(app).get('/api/home');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('trendingTopics');
    expect(res.body.data.trendingTopics.length).toBe(1);
    expect(res.body.data.trendingTopics[0].name).toBe('Nanotechnology');

    expect(res.body.data).toHaveProperty('headlines');
    expect(res.body.data.headlines.length).toBe(1);
    expect(res.body.data.headlines[0].title).toBe('Quantum Dots in Solar Energy');
    // Ensure content body was excluded
    expect(res.body.data.headlines[0].content).toBeUndefined();

    expect(res.body.data).toHaveProperty('moleculeOfTheDay');
    expect(res.body.data.moleculeOfTheDay.name).toBe('Benzene');

    expect(res.body.data.unreadNotificationCount).toBe(0);
  });

  it('should populate unreadNotificationCount for authenticated users', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'test@chempulse.io',
      passwordHash: 'Password123!'
    });

    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    const res = await request(app)
      .get('/api/home')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unreadNotificationCount).toBe(0);
  });
});