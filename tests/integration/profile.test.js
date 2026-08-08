const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let User;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5009';
  process.env.CORS_ORIGIN = '*';
  process.env.JWT_SECRET = 'test_profile_jwt_secret_123';
  process.env.JWT_REFRESH_SECRET = 'test_profile_jwt_refresh_123';

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

describe('User Profile REST API', () => {
  it('GET /api/profile - should return current authenticated user profile', async () => {
    const user = await User.create({
      name: 'Rosalind Franklin',
      email: 'rosalind@chempulse.io',
      passwordHash: 'Password123!'
    });

    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('rosalind@chempulse.io');
    expect(res.body.data.user.notificationPreferences.dailyAlerts).toBe(true);
  });

  it('PATCH /api/profile - should allow updating display name and notification preferences', async () => {
    const user = await User.create({
      name: 'Linus Pauling',
      email: 'linus@chempulse.io',
      passwordHash: 'Password123!'
    });

    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    const res = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Linus C. Pauling',
        avatarUrl: 'https://chempulse.io/avatars/pauling.jpg',
        notificationPreferences: {
          dailyAlerts: false,
          quizReminders: true
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Linus C. Pauling');
    expect(res.body.data.user.avatarUrl).toBe('https://chempulse.io/avatars/pauling.jpg');
    expect(res.body.data.user.notificationPreferences.dailyAlerts).toBe(false);
    expect(res.body.data.user.notificationPreferences.quizReminders).toBe(true);
  });

  it('PATCH /api/profile - should ignore security-sensitive fields (roles, password, emailVerified)', async () => {
    const user = await User.create({
      name: 'Standard User',
      email: 'user@chempulse.io',
      passwordHash: 'Password123!',
      roles: ['user'],
      emailVerified: false
    });

    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    const res = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Name',
        roles: ['admin'], // Attempted privilege escalation
        emailVerified: true,
        email: 'hacked@chempulse.io'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Updated Name');
    expect(res.body.data.user.roles).toEqual(['user']); // Ensure roles were NOT modified
    expect(res.body.data.user.emailVerified).toBe(false);
    expect(res.body.data.user.email).toBe('user@chempulse.io');
  });
});