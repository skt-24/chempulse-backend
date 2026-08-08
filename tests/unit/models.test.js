const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Category = require('../../src/models/Category');
const Article = require('../../src/models/Article');
const Molecule = require('../../src/models/Molecule');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Promise.all([
    Category.deleteMany({}),
    Article.deleteMany({}),
    Molecule.deleteMany({})
  ]);
});

describe('Content Database Models', () => {
  describe('Category Model', () => {
    it('should validate category creation and unique slug constraint', async () => {
      await Category.create({
        name: 'Organic',
        slug: 'organic'
      });

      let duplicateError;
      try {
        await Category.create({
          name: 'Organic Copy',
          slug: 'organic'
        });
      } catch (err) {
        duplicateError = err;
      }

      expect(duplicateError).toBeDefined();
      expect(duplicateError.code).toBe(11000); // Duplicate key error code
    });

    it('should populate virtual articleCount correctly', async () => {
      const cat = await Category.create({ name: 'Biochemistry', slug: 'biochem' });

      await Article.create({
        title: 'Enzyme Kinetics Overview',
        slug: 'enzyme-kinetics',
        excerpt: 'Short summary of enzyme dynamics.',
        content: 'Full article text regarding biochemistry...',
        author: { name: 'Dr. Smith' },
        category: cat._id,
        status: 'published'
      });

      const populatedCat = await Category.findById(cat._id).populate('articleCount');
      expect(populatedCat.articleCount).toBe(1);
    });
  });

  describe('Molecule Model', () => {
    it('should enforce unique MOTD featuredDate constraint', async () => {
      const date = new Date('2026-08-03');

      await Molecule.create({
        name: 'Water',
        slug: 'water',
        formula: 'H2O',
        molarMass: 18.015,
        description: 'Universal solvent',
        featuredDate: date
      });

      let error;
      try {
        await Molecule.create({
          name: 'Heavy Water',
          slug: 'heavy-water',
          formula: 'D2O',
          molarMass: 20.02,
          description: 'Deuterium oxide',
          featuredDate: date
        });
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000);
    });
  });

  describe('Article Model', () => {
    it('should reject missing required fields', async () => {
      let error;
      try {
        await Article.create({
          title: 'Incomplete Article'
        });
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.name).toBe('ValidationError');
    });
  });
});