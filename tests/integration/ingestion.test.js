const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let User;
let Category;
let Source;
let Article;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5012';
  process.env.CORS_ORIGIN = '*';
  process.env.JWT_SECRET = 'test_ingestion_jwt_secret_123';
  process.env.JWT_REFRESH_SECRET = 'test_ingestion_jwt_refresh_123';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = require('../../src/app');
  User = require('../../src/models/User');
  Category = require('../../src/models/Category');
  Source = require('../../src/models/Source');
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

describe('Content Ingestion Engine (/api/admin/ingestion)', () => {
  it('should run source ingestion, populate draft queue, and prevent duplicates', async () => {
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@chempulse.io',
      passwordHash: 'Password123!',
      roles: ['admin']
    });
    const token = require('../../src/utils/tokens').generateAccessToken(admin._id, admin.roles);

    const category = await Category.create({ name: 'Green Chem', slug: 'green-chem' });

    const source = await Source.create({
      name: 'Open Access Chemistry Feed',
      slug: 'open-access-chem-feed',
      type: 'open_access',
      defaultCategory: category._id,
      autoPublish: false // Content must enter pending_review queue
    });

    // 1. First Ingestion Run
    const runRes1 = await request(app)
      .post(`/api/admin/ingestion/sources/${source._id}/run`)
      .set('Authorization', `Bearer ${token}`);

    expect(runRes1.status).toBe(200);
    expect(runRes1.body.data.ingestedCount).toBe(2);
    expect(runRes1.body.data.skippedDuplicates).toBe(0);

    // Verify articles were saved as draft / pending_review
    const pendingArticle = await Article.findOne({ externalId: 'DOI-10.1021/acs.chemrev.demo01' });
    expect(pendingArticle).toBeDefined();
    expect(pendingArticle.status).toBe('draft');
    expect(pendingArticle.ingestionStatus).toBe('pending_review');
    expect(pendingArticle.attributionText).toContain('Open Access Chemistry Feed');

    // 2. Second Ingestion Run (Duplicate Detection Check)
    const runRes2 = await request(app)
      .post(`/api/admin/ingestion/sources/${source._id}/run`)
      .set('Authorization', `Bearer ${token}`);

    expect(runRes2.status).toBe(200);
    expect(runRes2.body.data.ingestedCount).toBe(0);
    expect(runRes2.body.data.skippedDuplicates).toBe(2);
  });

  it('should approve ingested draft article and move to published status', async () => {
    const admin = await User.create({
      name: 'Admin Reviewer',
      email: 'reviewer@chempulse.io',
      passwordHash: 'Password123!',
      roles: ['admin']
    });
    const token = require('../../src/utils/tokens').generateAccessToken(admin._id, admin.roles);

    const category = await Category.create({ name: 'Physical Chem', slug: 'physical-chem' });
    const source = await Source.create({ name: 'Source 2', slug: 'source-2', type: 'manual', defaultCategory: category._id });

    const article = await Article.create({
      title: 'Ingested Candidate',
      slug: 'ingested-candidate',
      excerpt: 'Summary...',
      content: 'Content...',
      author: { name: 'External Author' },
      category: category._id,
      source: source._id,
      status: 'draft',
      ingestionStatus: 'pending_review'
    });

    const approveRes = await request(app)
      .patch(`/api/admin/ingestion/review-queue/${article._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.article.status).toBe('published');
    expect(approveRes.body.data.article.ingestionStatus).toBe('approved');
  });
});