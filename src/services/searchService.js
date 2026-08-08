const Article = require('../models/Article');
const Topic = require('../models/Topic');
const Category = require('../models/Category');
const Molecule = require('../models/Molecule');

// Utility to escape regex special characters and prevent NoSQL/Regex injection
const escapeRegex = (text) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

const search = async (queryParams) => {
  const { q, type = 'all', page = 1, limit = 10 } = queryParams;

  const sanitizedQuery = q.trim();
  const escapedQuery = escapeRegex(sanitizedQuery);
  const regexPattern = new RegExp(escapedQuery, 'i');

  const skip = (page - 1) * limit;

  let results = [];
  let total = 0;

  if (type === 'article') {
    const filter = {
      status: 'published',
      $or: [
        { title: regexPattern },
        { excerpt: regexPattern },
        { content: regexPattern }
      ]
    };

    const [articles, count] = await Promise.all([
      Article.find(filter)
        .skip(skip)
        .limit(limit)
        .select('title slug excerpt category heroImage publishedAt readTimeMinutes')
        .populate('category', 'name slug')
        .lean(),
      Article.countDocuments(filter)
    ]);

    total = count;
    results = articles.map((art) => ({
      type: 'article',
      id: art._id,
      title: art.title,
      slug: art.slug,
      excerpt: art.excerpt,
      category: art.category ? art.category.name : null,
      heroImage: art.heroImage ? art.heroImage.url : null,
      publishedAt: art.publishedAt,
      readTimeMinutes: art.readTimeMinutes
    }));
  } else if (type === 'molecule') {
    const filter = {
      $or: [
        { name: regexPattern },
        { formula: regexPattern },
        { description: regexPattern },
        { commonUses: regexPattern }
      ]
    };

    const [molecules, count] = await Promise.all([
      Molecule.find(filter)
        .skip(skip)
        .limit(limit)
        .select('name slug formula molarMass description structureImage')
        .lean(),
      Molecule.countDocuments(filter)
    ]);

    total = count;
    results = molecules.map((mol) => ({
      type: 'molecule',
      id: mol._id,
      name: mol.name,
      slug: mol.slug,
      formula: mol.formula,
      molarMass: mol.molarMass,
      description: mol.description,
      structureImage: mol.structureImage ? mol.structureImage.url : null
    }));
  } else if (type === 'category') {
    const filter = {
      active: true,
      $or: [{ name: regexPattern }, { description: regexPattern }]
    };

    const [categories, count] = await Promise.all([
      Category.find(filter)
        .skip(skip)
        .limit(limit)
        .select('name slug description icon')
        .lean(),
      Category.countDocuments(filter)
    ]);

    total = count;
    results = categories.map((cat) => ({
      type: 'category',
      id: cat._id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon
    }));
  } else if (type === 'topic') {
    const filter = {
      active: true,
      $or: [{ name: regexPattern }, { description: regexPattern }]
    };

    const [topics, count] = await Promise.all([
      Topic.find(filter)
        .skip(skip)
        .limit(limit)
        .select('name slug description isTrending trendingScore')
        .lean(),
      Topic.countDocuments(filter)
    ]);

    total = count;
    results = topics.map((top) => ({
      type: 'topic',
      id: top._id,
      name: top.name,
      slug: top.slug,
      description: top.description,
      isTrending: top.isTrending
    }));
  } else {
    // Type === 'all': Multi-entity aggregated query
    const [articles, molecules, categories, topics] = await Promise.all([
      Article.find({
        status: 'published',
        $or: [{ title: regexPattern }, { excerpt: regexPattern }]
      })
        .limit(limit)
        .select('title slug excerpt category publishedAt')
        .populate('category', 'name slug')
        .lean(),

      Molecule.find({
        $or: [{ name: regexPattern }, { formula: regexPattern }, { description: regexPattern }]
      })
        .limit(limit)
        .select('name slug formula molarMass description')
        .lean(),

      Category.find({
        active: true,
        $or: [{ name: regexPattern }, { description: regexPattern }]
      })
        .limit(limit)
        .select('name slug description icon')
        .lean(),

      Topic.find({
        active: true,
        $or: [{ name: regexPattern }, { description: regexPattern }]
      })
        .limit(limit)
        .select('name slug description isTrending')
        .lean()
    ]);

    const formattedArticles = articles.map((art) => ({
      type: 'article',
      id: art._id,
      title: art.title,
      slug: art.slug,
      excerpt: art.excerpt,
      category: art.category ? art.category.name : null,
      publishedAt: art.publishedAt
    }));

    const formattedMolecules = molecules.map((mol) => ({
      type: 'molecule',
      id: mol._id,
      name: mol.name,
      slug: mol.slug,
      formula: mol.formula,
      description: mol.description
    }));

    const formattedCategories = categories.map((cat) => ({
      type: 'category',
      id: cat._id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description
    }));

    const formattedTopics = topics.map((top) => ({
      type: 'topic',
      id: top._id,
      name: top.name,
      slug: top.slug,
      description: top.description
    }));

    const combined = [
      ...formattedArticles,
      ...formattedMolecules,
      ...formattedCategories,
      ...formattedTopics
    ];

    total = combined.length;
    results = combined.slice(skip, skip + limit);
  }

  return {
    query: sanitizedQuery,
    type,
    results,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit) || 0
    }
  };
};

module.exports = { search };