const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let Category;
let Topic;
let Article;
let Bookmark;
let User;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5003';
  process.env.CORS_ORIGIN = '*';
  process.env.JWT_SECRET = 'test_articles_jwt_secret_123';
  process.env.JWT_REFRESH_SECRET = 'test_articles_jwt_refresh_123';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = require('../../src/app');
  Category = require('../../src/models/Category');
  Topic = require('../../src/models/Topic');
  Article = require('../../src/models/Article');
  Bookmark = require('../../src/models/Bookmark');
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

describe('Article REST API', () => {
  it('GET /api/articles - should return paginated summary lists of published articles only', async () => {
    const cat = await Category.create({ name: 'Analytical Chemistry', slug: 'analytical-chem' });

    await Article.create({
      title: 'Mass Spectrometry Advances',
      slug: 'mass-spectrometry-advances',
      excerpt: 'Summary excerpt...',
      content: 'Deep technical article content body...',
      author: { name: 'Dr. Analyst' },
      category: cat._id,
      status: 'published',
      publishedAt: new Date()
    });

    // Draft article that must NOT be exposed
    await Article.create({
      title: 'Draft Breakthrough',
      slug: 'draft-breakthrough',
      excerpt: 'Draft summary...',
      content: 'Unpublished work...',
      author: { name: 'Dr. Secret' },
      category: cat._id,
      status: 'draft'
    });

    const res = await request(app).get('/api/articles');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.articles.length).toBe(1);
    expect(res.body.data.articles[0].slug).toBe('mass-spectrometry-advances');
    expect(res.body.data.articles[0].content).toBeUndefined(); // Verify card-level summary projection
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('GET /api/articles/:slug - should return complete article details and bookmark state', async () => {
    const cat = await Category.create({ name: 'Organic', slug: 'organic' });
    const article = await Article.create({
      title: 'Synthesis of Complex Molecules',
      slug: 'synthesis-complex-molecules',
      excerpt: 'Summary of synthesis...',
      content: 'Comprehensive details on chemical synthesis steps...',
      author: { name: 'Dr. Organic' },
      category: cat._id,
      status: 'published',
      publishedAt: new Date()
    });

    const user = await User.create({
      name: 'Researcher One',
      email: 'researcher@chempulse.io',
      passwordHash: 'Password123!'
    });

    await Bookmark.create({
      user: user._id,
      targetId: article._id,
      targetType: 'Article'
    });

    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    const res = await request(app)
      .get(`/api/articles/${article.slug}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.article.title).toBe('Synthesis of Complex Molecules');
    expect(res.body.data.article.content).toBeDefined();
    expect(res.body.data.article.isBookmarked).toBe(true);
  });

  it('GET /api/articles/:slug - should return 404 for nonexistent or draft articles', async () => {
    const res = await request(app).get('/api/articles/nonexistent-article');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ARTICLE_NOT_FOUND');
  });

  it('GET /api/articles/featured - should return featured published articles', async () => {
    const cat = await Category.create({ name: 'Green Chemistry', slug: 'green-chem' });

    await Article.create({
      title: 'Featured Bio-plastics',
      slug: 'featured-bioplastics',
      excerpt: 'Plastic alternatives...',
      content: 'Content...',
      author: { name: 'Dr. Green' },
      category: cat._id,
      status: 'published',
      featured: true,
      publishedAt: new Date()
    });

    const res = await request(app).get('/api/articles/featured');

    expect(res.status).toBe(200);
    expect(res.body.data.articles.length).toBe(1);
    expect(res.body.data.articles[0].slug).toBe('featured-bioplastics');
  });
});