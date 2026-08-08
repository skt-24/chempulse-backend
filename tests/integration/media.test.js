const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let User;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5013';
  process.env.CORS_ORIGIN = '*';
  process.env.JWT_SECRET = 'test_media_jwt_secret_123';
  process.env.JWT_REFRESH_SECRET = 'test_media_jwt_refresh_123';

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

describe('Media Upload & Management API (/api/media)', () => {
  it('POST /api/media/upload - should allow uploading valid PNG images', async () => {
    const user = await User.create({ name: 'Uploader', email: 'uploader@chempulse.io', passwordHash: 'Password123!' });
    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    // Valid PNG Buffer (89 50 4E 47 0D 0A 1A 0A)
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

    const res = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', validPngBuffer, { filename: 'avatar.png', contentType: 'image/png' })
      .field('folder', 'avatars');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.media.url).toContain('/uploads/avatars/');
    expect(res.body.data.media.mimeType).toBe('image/png');
  });

  it('POST /api/media/upload - should REJECT executables disguised with image extensions', async () => {
    const user = await User.create({ name: 'Hacker', email: 'hacker@chempulse.io', passwordHash: 'Password123!' });
    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    // Fake image containing shell script / binary executable bytes
    const fakeImageBuffer = Buffer.from('#!/bin/bash\necho "exploit"', 'utf8');

    const res = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', fakeImageBuffer, { filename: 'malicious.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CORRUPTED_OR_DANGEROUS_FILE');
  });

  it('DELETE /api/media/:id - should enforce uploader ownership on deletion', async () => {
    const user1 = await User.create({ name: 'User 1', email: 'u1@chempulse.io', passwordHash: 'Password123!' });
    const user2 = await User.create({ name: 'User 2', email: 'u2@chempulse.io', passwordHash: 'Password123!' });

    const token1 = require('../../src/utils/tokens').generateAccessToken(user1._id);
    const token2 = require('../../src/utils/tokens').generateAccessToken(user2._id);

    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const uploadRes = await request(app)
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${token1}`)
      .attach('file', validPngBuffer, { filename: 'hero.png', contentType: 'image/png' });

    const mediaId = uploadRes.body.data.media._id;

    // User 2 attempts to delete User 1's upload
    const deleteRes = await request(app)
      .delete(`/api/media/${mediaId}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.error.code).toBe('FORBIDDEN');
  });
});