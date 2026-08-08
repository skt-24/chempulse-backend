const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let Category;
let CategoryHub;
let Article;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5004';
  process.env.CORS_ORIGIN = '*';
  process.env.JWT_SECRET = 'test_categories_jwt_secret_123';
  process.env.JWT_REFRESH_SECRET = 'test_categories_jwt_refresh_123';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = require('../../src/app');
  Category = require('../../src/models/Category');
  CategoryHub = require('../../src/models/CategoryHub');
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

describe('Category REST API', () => {
  it('GET /api/categories - should list active categories with published article counts', async () => {
    const organicCat = await Category.create({ name: 'Organic Chemistry', slug: 'organic-chemistry', displayOrder: 1 });
    await Category.create({ name: 'Inorganic Chemistry', slug: 'inorganic-chemistry', displayOrder: 2 });

    await Article.create({
      title: 'Alkene Synthesis',
      slug: 'alkene-synthesis',
      excerpt: 'Summary...',
      content: 'Content...',
      author: { name: 'Dr. Chem' },
      category: organicCat._id,
      status: 'published'
    });

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.categories.length).toBe(2);

    const organicInList = res.body.data.categories.find((c) => c.slug === 'organic-chemistry');
    expect(organicInList.articleCount).toBe(1);
  });

  it('GET /api/categories/:slug/articles - should return paginated category articles', async () => {
    const cat = await Category.create({ name: 'Green Chemistry', slug: 'green-chemistry' });

    await Article.create({
      title: 'Green Catalysts',
      slug: 'green-catalysts',
      excerpt: 'Catalyst excerpt...',
      content: 'Full article text...',
      author: { name: 'Dr. Green' },
      category: cat._id,
      status: 'published',
      publishedAt: new Date()
    });

    const res = await request(app).get(`/api/categories/${cat.slug}/articles`);

    expect(res.status).toBe(200);
    expect(res.body.data.category.name).toBe('Green Chemistry');
    expect(res.body.data.articles.length).toBe(1);
    expect(res.body.data.articles[0].slug).toBe('green-catalysts');
  });

  it('GET /api/categories/:slug/hub - should return specialized hub config for Fuel & Energy', async () => {
    const fuelCat = await Category.create({ name: 'Fuel & Energy', slug: 'fuel-and-energy' });

    const article = await Article.create({
      title: 'Hydrogen Fuel Cell Efficiency',
      slug: 'hydrogen-fuel-cell-efficiency',
      excerpt: 'Cell efficiency breakthrough...',
      content: 'Content...',
      author: { name: 'Dr. Power' },
      category: fuelCat._id,
      status: 'published'
    });

    await CategoryHub.create({
      category: fuelCat._id,
      heroTitle: 'Fuel & Energy Hub',
      heroDescription: 'Hero description for energy tech.',
      statistics: [{ label: 'Capacity', value: '100', unit: 'MW' }],
      subtopics: [{ name: 'Hydrogen', slug: 'hydrogen' }, { name: 'Biofuels', slug: 'biofuels' }, { name: 'Batteries & Storage', slug: 'batteries-and-storage' }],
      featuredArticles: [article._id]
    });

    const res = await request(app).get(`/api/categories/${fuelCat.slug}/hub`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hub.heroTitle).toBe('Fuel & Energy Hub');
    expect(res.body.data.hub.subtopics.length).toBe(3);
    expect(res.body.data.hub.statistics[0].label).toBe('Capacity');
    expect(res.body.data.hub.featuredArticles.length).toBe(1);
    expect(res.body.data.hub.featuredArticles[0].slug).toBe('hydrogen-fuel-cell-efficiency');
  });

  it('GET /api/categories/:slug/hub - should return 404 if category has no specialized hub', async () => {
    const cat = await Category.create({ name: 'Inorganic Chemistry', slug: 'inorganic-chemistry' });

    const res = await request(app).get(`/api/categories/${cat.slug}/hub`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('HUB_NOT_FOUND');
  });
});