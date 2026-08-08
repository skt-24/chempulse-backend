const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let User;
let Article;
let Molecule;
let Category;
let Bookmark;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5007';
  process.env.CORS_ORIGIN = '*';
  process.env.JWT_SECRET = 'test_bookmarks_jwt_secret_123';
  process.env.JWT_REFRESH_SECRET = 'test_bookmarks_jwt_refresh_123';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = require('../../src/app');
  User = require('../../src/models/User');
  Article = require('../../src/models/Article');
  Molecule = require('../../src/models/Molecule');
  Category = require('../../src/models/Category');
  Bookmark = require('../../src/models/Bookmark');
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

describe('User Bookmarks REST API', () => {
  it('should allow authenticated user to bookmark and unbookmark an article', async () => {
    const user = await User.create({ name: 'User One', email: 'user1@chempulse.io', passwordHash: 'Password123!' });
    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    const cat = await Category.create({ name: 'Organic', slug: 'organic' });
    const article = await Article.create({
      title: 'Alkane Reactions',
      slug: 'alkane-reactions',
      excerpt: 'Summary...',
      content: 'Content...',
      author: { name: 'Dr. Chem' },
      category: cat._id,
      status: 'published'
    });

    // 1. Add Bookmark
    const addRes = await request(app)
      .post(`/api/bookmarks/articles/${article._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(addRes.status).toBe(201);
    expect(addRes.body.success).toBe(true);

    // 2. Fetch User Bookmarks
    const getRes = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.bookmarks.length).toBe(1);
    expect(getRes.body.data.bookmarks[0].item.title).toBe('Alkane Reactions');

    // 3. Delete Bookmark
    const delRes = await request(app)
      .delete(`/api/bookmarks/articles/${article._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(200);

    const getResAfter = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`);

    expect(getResAfter.body.data.bookmarks.length).toBe(0);
  });

  it('should prevent bookmarking non-existent articles', async () => {
    const user = await User.create({ name: 'User Two', email: 'user2@chempulse.io', passwordHash: 'Password123!' });
    const token = require('../../src/utils/tokens').generateAccessToken(user._id);
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/api/bookmarks/articles/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('should isolate bookmarks between users', async () => {
    const user1 = await User.create({ name: 'User A', email: 'usera@chempulse.io', passwordHash: 'Password123!' });
    const user2 = await User.create({ name: 'User B', email: 'userb@chempulse.io', passwordHash: 'Password123!' });

    const token1 = require('../../src/utils/tokens').generateAccessToken(user1._id);
    const token2 = require('../../src/utils/tokens').generateAccessToken(user2._id);

    const molecule = await Molecule.create({
      name: 'Ethanol',
      slug: 'ethanol',
      formula: 'C2H6O',
      molarMass: 46.07,
      description: 'Alcohol'
    });

    await request(app)
      .post(`/api/bookmarks/molecules/${molecule._id}`)
      .set('Authorization', `Bearer ${token1}`);

    const resUser2 = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${token2}`);

    expect(resUser2.status).toBe(200);
    expect(resUser2.body.data.bookmarks.length).toBe(0);
  });
});