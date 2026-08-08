const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let User;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5001';
  process.env.CORS_ORIGIN = '*';
  process.env.JWT_SECRET = 'test_jwt_secret_12345';
  process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_12345';
  process.env.JWT_ACCESS_EXPIRATION = '15m';
  process.env.JWT_REFRESH_EXPIRATION = '7d';

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  await mongoose.connect(process.env.MONGODB_URI);

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

describe('Authentication Engine API', () => {
  const mockUser = {
    name: 'Marie Curie',
    email: 'marie.curie@chempulse.io',
    password: 'Password123!'
  };

  it('POST /api/auth/signup - should register a new user and return tokens', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send(mockUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toHaveProperty('id');
    expect(res.body.data.user.email).toBe(mockUser.email);
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  it('POST /api/auth/signup - should fail on duplicate email', async () => {
    await request(app).post('/api/auth/signup').send(mockUser);

    const res = await request(app).post('/api/auth/signup').send(mockUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('POST /api/auth/login - should authenticate valid user', async () => {
    await request(app).post('/api/auth/signup').send(mockUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: mockUser.email, password: mockUser.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('POST /api/auth/login - should fail with incorrect password', async () => {
    await request(app).post('/api/auth/signup').send(mockUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: mockUser.email, password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET /api/auth/me - should allow access with valid token', async () => {
    const signupRes = await request(app).post('/api/auth/signup').send(mockUser);
    const token = signupRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(mockUser.email);
  });

  it('GET /api/auth/me - should reject request without token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/auth/refresh - should issue new tokens via rotation', async () => {
    const signupRes = await request(app).post('/api/auth/signup').send(mockUser);
    const refreshToken = signupRes.body.data.refreshToken;

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
  });

  it('POST /api/auth/logout - should invalidate refresh token', async () => {
    const signupRes = await request(app).post('/api/auth/signup').send(mockUser);
    const refreshToken = signupRes.body.data.refreshToken;

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken });

    expect(logoutRes.status).toBe(200);

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(401);
  });

  it('Password Reset Flow - should generate token and update password', async () => {
    await request(app).post('/api/auth/signup').send(mockUser);

    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: mockUser.email });

    expect(forgotRes.status).toBe(200);

    const user = await User.findOne({ email: mockUser.email }).select('+resetPasswordToken');
    expect(user.resetPasswordToken).toBeDefined();

    // Direct token test simulation
    const rawResetToken = user.createPasswordResetToken();
    await user.save();

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawResetToken, newPassword: 'NewSecurePassword123!' });

    expect(resetRes.status).toBe(200);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: mockUser.email, password: 'NewSecurePassword123!' });

    expect(loginRes.status).toBe(200);
  });
});