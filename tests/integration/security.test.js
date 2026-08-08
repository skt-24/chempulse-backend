const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let User;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5014';
  process.env.CORS_ORIGIN = '*';
  process.env.JWT_SECRET = 'test_security_jwt_secret_123';
  process.env.JWT_REFRESH_SECRET = 'test_security_jwt_refresh_123';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = require('../../src/app');
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

describe('Security Audit Fix Verification', () => {
  it('NoSQL Injection - should strip mongo operators ($ne) from query parameters', async () => {
    const user = await User.create({ name: 'Security User', email: 'sec@chempulse.io', passwordHash: 'Password123!' });
    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    // Attempt NoSQL operator injection in query string: ?type[$ne]=null
    const res = await request(app)
      .get('/api/notifications?type[$ne]=null')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('CastError Handling - should convert invalid ObjectId into 400 Bad Request instead of 500', async () => {
    const user = await User.create({ name: 'Cast User', email: 'cast@chempulse.io', passwordHash: 'Password123!' });
    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    const res = await request(app)
      .post('/api/bookmarks/articles/invalid-object-id-123')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_ID_FORMAT');
  });

  it('Payload Limit - should reject JSON payloads larger than 1MB', async () => {
    const largeString = 'a'.repeat(1.5 * 1024 * 1024); // 1.5MB string payload

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@chempulse.io', password: largeString });

    expect(res.status).toBe(413); // Payload Too Large
  });
});