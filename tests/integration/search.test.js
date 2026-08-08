const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let Article;
let Category;
let Topic;
let Molecule;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5005';
  process.env.CORS_ORIGIN = '*';
  process.env.JWT_SECRET = 'test_search_jwt_secret_123';
  process.env.JWT_REFRESH_SECRET = 'test_search_jwt_refresh_123';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = require('../../src/app');
  Article = require('../../src/models/Article');
  Category = require('../../src/models/Category');
  Topic = require('../../src/models/Topic');
  Molecule = require('../../src/models/Molecule');
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

describe('Search REST API', () => {
  it('GET /api/search - should perform multi-entity search and exclude drafts', async () => {
    const cat = await Category.create({ name: 'Quantum Chemistry', slug: 'quantum-chem' });

    await Article.create({
      title: 'Quantum Computing in Drug Design',
      slug: 'quantum-computing-drug-design',
      excerpt: 'Quantum simulation techniques...',
      content: 'Content...',
      author: { name: 'Dr. Quantum' },
      category: cat._id,
      status: 'published'
    });

    // Draft that should NEVER appear in search
    await Article.create({
      title: 'Quantum Mechanics Draft',
      slug: 'quantum-mechanics-draft',
      excerpt: 'Draft excerpt...',
      content: 'Draft content...',
      author: { name: 'Dr. Draft' },
      category: cat._id,
      status: 'draft'
    });

    await Molecule.create({
      name: 'Methane Quantum Complex',
      slug: 'methane-quantum-complex',
      formula: 'CH4',
      molarMass: 16.04,
      description: 'Quantum physical simulation subject'
    });

    const res = await request(app).get('/api/search?q=Quantum');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results.length).toBe(3); // 1 Category, 1 Published Article, 1 Molecule
    
    // Ensure draft was excluded
    const draftArticle = res.body.data.results.find((r) => r.slug === 'quantum-mechanics-draft');
    expect(draftArticle).toBeUndefined();
  });

  it('GET /api/search - should filter results by type=molecule', async () => {
    await Molecule.create({
      name: 'Hydrogen Peroxide',
      slug: 'hydrogen-peroxide',
      formula: 'H2O2',
      molarMass: 34.014,
      description: 'Oxidizing chemical compound'
    });

    const res = await request(app).get('/api/search?q=Hydrogen&type=molecule');

    expect(res.status).toBe(200);
    expect(res.body.data.results.length).toBe(1);
    expect(res.body.data.results[0].type).toBe('molecule');
    expect(res.body.data.results[0].name).toBe('Hydrogen Peroxide');
  });

  it('GET /api/search - should safely handle regex special characters without crashing', async () => {
    const res = await request(app).get('/api/search?q=H2O[.*]+(?=test)');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results).toEqual([]);
  });

  it('GET /api/search - should fail with 400 when missing query parameter q', async () => {
    const res = await request(app).get('/api/search');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });
});