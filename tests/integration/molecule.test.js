const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let Molecule;
let Bookmark;
let User;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5006';
  process.env.CORS_ORIGIN = '*';
  process.env.JWT_SECRET = 'test_molecules_jwt_secret_123';
  process.env.JWT_REFRESH_SECRET = 'test_molecules_jwt_refresh_123';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = require('../../src/app');
  Molecule = require('../../src/models/Molecule');
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

describe('Molecule REST API', () => {
  it('GET /api/molecules/today - should return deterministic MOTD consistently', async () => {
    await Molecule.create({
      name: 'Water',
      slug: 'water',
      formula: 'H2O',
      molarMass: 18.015,
      description: 'Universal solvent'
    });

    await Molecule.create({
      name: 'Carbon Dioxide',
      slug: 'carbon-dioxide',
      formula: 'CO2',
      molarMass: 44.01,
      description: 'Greenhouse gas'
    });

    const res1 = await request(app).get('/api/molecules/today');
    const res2 = await request(app).get('/api/molecules/today');

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.molecule).toBeDefined();
    // Deterministic equality test across identical UTC requests
    expect(res1.body.data.molecule.slug).toBe(res2.body.data.molecule.slug);
  });

  it('GET /api/molecules - should return paginated list of molecules', async () => {
    await Molecule.create({
      name: 'Ethanol',
      slug: 'ethanol',
      formula: 'C2H6O',
      molarMass: 46.07,
      description: 'Alcohol'
    });

    const res = await request(app).get('/api/molecules');

    expect(res.status).toBe(200);
    expect(res.body.data.molecules.length).toBe(1);
    expect(res.body.data.molecules[0].slug).toBe('ethanol');
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('GET /api/molecules/:slug - should return molecule detail with authenticated bookmark state', async () => {
    const mol = await Molecule.create({
      name: 'Aspirin',
      slug: 'aspirin',
      formula: 'C9H8O4',
      molarMass: 180.16,
      description: 'Analgesic drug'
    });

    const user = await User.create({
      name: 'Pharmacist User',
      email: 'pharma@chempulse.io',
      passwordHash: 'Password123!'
    });

    await Bookmark.create({
      user: user._id,
      targetId: mol._id,
      targetType: 'Molecule'
    });

    const token = require('../../src/utils/tokens').generateAccessToken(user._id);

    const res = await request(app)
      .get('/api/molecules/aspirin')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.molecule.name).toBe('Aspirin');
    expect(res.body.data.molecule.isBookmarked).toBe(true);
  });

  it('GET /api/molecules/:slug/related - should return related molecules', async () => {
    await Molecule.create({ name: 'Methane', slug: 'methane', formula: 'CH4', molarMass: 16.04, description: 'Alkane' });
    await Molecule.create({ name: 'Ethane', slug: 'ethane', formula: 'C2H6', molarMass: 30.07, description: 'Alkane' });

    const res = await request(app).get('/api/molecules/methane/related');

    expect(res.status).toBe(200);
    expect(res.body.data.molecules.length).toBe(1);
    expect(res.body.data.molecules[0].slug).toBe('ethane');
  });
});