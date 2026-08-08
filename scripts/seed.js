const mongoose = require('mongoose');
const env = require('../src/config/env');

const Category = require('../src/models/Category');
const CategoryHub = require('../src/models/CategoryHub');
const Topic = require('../src/models/Topic');
const Article = require('../src/models/Article');
const Molecule = require('../src/models/Molecule');

async function seed() {
  if (env.NODE_ENV === 'production') {
    console.error('[SAFETY BLOCK] Seed script cannot be run in production mode!');
    process.exit(1);
  }

  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);

    console.log('[Seed] Clearing existing demo data...');
    await Promise.all([
      Category.deleteMany({ isDemoData: true }),
      CategoryHub.deleteMany({ isDemoData: true }),
      Topic.deleteMany({ isDemoData: true }),
      Article.deleteMany({ isDemoData: true }),
      Molecule.deleteMany({ isDemoData: true })
    ]);

    console.log('[Seed] Seeding Android App categories...');
    const categoriesData = [
      { name: 'Analytical Chemistry', slug: 'analytical-chemistry', description: 'Techniques for chemical separation and quantitation.', displayOrder: 1, icon: { name: 'analytics' } },
      { name: 'Organic Chemistry', slug: 'organic-chemistry', description: 'Structure, properties, and reactions of carbon compounds.', displayOrder: 2, icon: { name: 'molecule' }, featured: true },
      { name: 'Inorganic Chemistry', slug: 'inorganic-chemistry', description: 'Synthesis and behavior of inorganic and organometallic compounds.', displayOrder: 3, icon: { name: 'atom' } },
      { name: 'Physical Chemistry', slug: 'physical-chemistry', description: 'Application of physics principles to chemical systems.', displayOrder: 4, icon: { name: 'speedometer' } },
      { name: 'Pharmaceutical Chemistry', slug: 'pharmaceutical-chemistry', description: 'Drug discovery, design, and metabolic action.', displayOrder: 5, icon: { name: 'pill' } },
      { name: 'Biochemistry', slug: 'biochemistry', description: 'Chemical processes within and relating to living organisms.', displayOrder: 6, icon: { name: 'dna' } },
      { name: 'Materials Chemistry', slug: 'materials-chemistry', description: 'Design and synthesis of novel solid-state materials.', displayOrder: 7, icon: { name: 'layers' } },
      { name: 'Fuel & Energy', slug: 'fuel-and-energy', description: 'Chemical technology driving sustainable fuel cells, biofuels, and batteries.', displayOrder: 8, icon: { name: 'lightning' }, featured: true },
      { name: 'Green Chemistry', slug: 'green-chemistry', description: 'Designing chemical processes that reduce or eliminate hazardous substances.', displayOrder: 9, icon: { name: 'leaf' }, featured: true }
    ].map((cat) => ({ ...cat, isDemoData: true }));

    const categories = await Category.create(categoriesData);

    const fuelEnergyCategory = categories.find((c) => c.slug === 'fuel-and-energy');

    console.log('[Seed] Seeding topics...');
    const topics = await Topic.create([
      { name: 'Hydrogen Transport', slug: 'hydrogen-transport', description: 'Cryogenic and metal-hydride storage technologies.', isTrending: true, trendingScore: 95, isDemoData: true },
      { name: 'Solid-State Batteries', slug: 'solid-state-batteries', description: 'Non-flammable electrolyte chemistry.', isTrending: true, trendingScore: 90, isDemoData: true }
    ]);

    console.log('[Seed] Seeding molecules...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await Molecule.create([
      {
        name: 'Hydrogen',
        slug: 'hydrogen',
        formula: 'H2',
        molarMass: 2.016,
        description: 'Clean energy carrier with zero carbon emission combustion.',
        commonUses: ['Fuel cell power', 'Ammonia synthesis', 'Petroleum refining'],
        featuredDate: today,
        isDemoData: true
      }
    ]);

    console.log('[Seed] Seeding articles...');
    const fuelArticle = await Article.create({
      title: 'Next-Gen Biofuel Synthesis via Algal Photobioreactors',
      slug: 'next-gen-biofuel-synthesis',
      excerpt: 'Engineered cyanobacteria boost lipid yield per hectare by 300%.',
      content: 'Detailed study on enzymatic catalytic degradation in continuous flow photobioreactors...',
      author: { name: 'Dr. Marcus Vance' },
      category: fuelEnergyCategory._id,
      topics: [topics[0]._id],
      status: 'published',
      featured: true,
      publishedAt: new Date(),
      readTimeMinutes: 6,
      isDemoData: true
    });

    console.log('[Seed] Seeding Fuel & Energy Hub Config...');
    await CategoryHub.create({
      category: fuelEnergyCategory._id,
      heroTitle: 'Fuel & Energy Innovation Hub',
      heroDescription: 'Exploring the chemical breakthroughs transforming global power grids, zero-emission transportation, and energy storage density.',
      heroImageUrl: 'https://chempulse.io/assets/fuel-energy-hero.jpg',
      statistics: [
        { label: 'Global Green Hydrogen Output', value: '4.2', unit: 'Mt/yr', description: 'Annual capacity' },
        { label: 'Battery Energy Density Record', value: '500', unit: 'Wh/kg', description: 'Solid state pouch cell' },
        { label: 'Biofuel Efficiency Gain', value: '+38%', unit: '', description: 'Year-over-year catalytic improvement' }
      ],
      subtopics: [
        { name: 'Biofuels', slug: 'biofuels', description: 'Cellulosic ethanol and algae-derived bio-jet fuels.' },
        { name: 'Hydrogen', slug: 'hydrogen', description: 'Electrolyzer catalysis and safe storage substrates.' },
        { name: 'Batteries & Storage', slug: 'batteries-and-storage', description: 'Lithium-sulfur, sodium-ion, and solid-state battery chemistry.' }
      ],
      featuredArticles: [fuelArticle._id],
      isDemoData: true
    });

    console.log('[Seed] Demo data successfully seeded!');
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error] Failed to seed database: ${error.message}`);
    process.exit(1);
  }
}

seed();