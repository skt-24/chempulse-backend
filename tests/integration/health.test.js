const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5015';
  process.env.CORS_ORIGIN = '*';
  process.env.JWT_SECRET = 'health_jwt_secret_123';
  process.env.JWT_REFRESH_SECRET = 'health_jwt_refresh_123';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = require('../../src/app');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Server Health Endpoint', () => {
  it('GET /health - should return UP status and service environment details', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
    expect(res.body.data.service).toBe('ChemPulse Backend API');
    expect(res.body.data.environment).toBe('test');
  });
});