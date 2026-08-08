const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let User;
let Category;
let Article;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5011';
  process.env.CORS_ORIGIN = '*';
  process.env.JWT_SECRET = 'test_admin_jwt_secret_123';
  process.env.JWT_REFRESH_SECRET = 'test_admin_jwt_refresh_123';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = require('../../src/app');
  User = require('../../src/models/User');
  Category = require('../../src/models/Category');
  Article = require('../../src/models/Article');
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

describe('Content Administration REST API (/api/admin)', () => {
  it('should block regular users (403 Forbidden) from accessing admin endpoints', async () => {
    const normalUser = await User.create({
      name: 'Ordinary User',
      email: 'user@chempulse.io',
      passwordHash: 'Password123!',
      roles: ['user']
    });

    const token = require('../../src/utils/tokens').generateAccessToken(normalUser._id, normalUser.roles);

    const res = await request(app)
      .post('/api/admin/articles')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Unauthorized Article' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should allow editors to create draft articles and generate slugs automatically', async () => {
    const editor = await User.create({
      name: 'Content Editor',
      email: 'editor@chempulse.io',
      passwordHash: 'Password123!',
      roles: ['editor']
    });

    const category = await Category.create({ name: 'Organic', slug: 'organic' });
    const token = require('../../src/utils/tokens').generateAccessToken(editor._id, editor.roles);

    const res = await request(app)
      .post('/api/admin/articles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'New Organic Reaction Mechanisms!',
        excerpt: 'Summary of organic mechanisms...',
        content: 'Deep explanation of mechanisms...',
        author: { name: 'Dr. Reaction' },
        category: category._id.toString(),
        status: 'draft'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.article.slug).toBe('new-organic-reaction-mechanisms');
    expect(res.body.data.article.status).toBe('draft');
    expect(res.body.data.article.publishedAt).toBeNull();
  });

  it('should allow admins to publish draft articles and set publishedAt timestamp', async () => {
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@chempulse.io',
      passwordHash: 'Password123!',
      roles: ['admin']
    });

    const category = await Category.create({ name: 'Physical', slug: 'physical' });
    const article = await Article.create({
      title: 'Thermodynamics Laws',
      slug: 'thermodynamics-laws',
      excerpt: 'Summary...',
      content: 'Content...',
      author: { name: 'Dr. Heat' },
      category: category._id,
      status: 'draft'
    });

    const token = require('../../src/utils/tokens').generateAccessToken(admin._id, admin.roles);

    const res = await request(app)
      .patch(`/api/admin/articles/${article._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'published'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.article.status).toBe('published');
    expect(res.body.data.article.publishedAt).toBeDefined();
  });

  it('should restrict hard article deletion to admins only (deny editors)', async () => {
    const editor = await User.create({
      name: 'Editor User',
      email: 'editor2@chempulse.io',
      passwordHash: 'Password123!',
      roles: ['editor']
    });

    const category = await Category.create({ name: 'Green Chem', slug: 'green-chem' });
    const article = await Article.create({
      title: 'Article To Delete',
      slug: 'article-to-delete',
      excerpt: 'Excerpt...',
      content: 'Content...',
      author: { name: 'Author' },
      category: category._id,
      status: 'draft'
    });

    const token = require('../../src/utils/tokens').generateAccessToken(editor._id, editor.roles);

    const res = await request(app)
      .delete(`/api/admin/articles/${article._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403); // Denied for editor role
  });
});