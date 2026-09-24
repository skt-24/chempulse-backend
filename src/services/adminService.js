const Article = require('../models/Article');
const Category = require('../models/Category');
const Topic = require('../models/Topic');
const Molecule = require('../models/Molecule');
const Quiz = require('../models/Quiz');
const CategoryHub = require('../models/CategoryHub');
const User = require('../models/User');
const Media = require('../models/Media');
const Vintage = require('../models/Vintage');

const ApiError = require('../utils/apiError');
const { slugify } = require('../utils/slugify');

// ======================================================
// DASHBOARD
// ======================================================

const getDashboardStats = async () => {
  const [
    articles,
    categories,
    topics,
    molecules,
    quizzes,
    users,
    media,
    vintage
  ] = await Promise.all([
    Article.countDocuments(),
    Category.countDocuments(),
    Topic.countDocuments(),
    Molecule.countDocuments(),
    Quiz.countDocuments(),
    User.countDocuments(),
    Media.countDocuments(),
    Vintage.countDocuments()
  ]);

  return {
    articles,
    categories,
    topics,
    molecules,
    quizzes,
    users,
    media,
    vintage
  };
};

// ======================================================
// ARTICLES
// ======================================================

const listArticles = async ({ q, category, status, page = 1, limit = 100 } = {}) => {
  const filter = {};
  if (category) filter.category = category;
  if (status && status !== 'all') filter.status = status;
  if (q) {
    const escaped = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { 'author.name': { $regex: escaped, $options: 'i' } }
    ];
  }
  const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 100));
  const [articles, total] = await Promise.all([
    Article.find(filter)
      .populate('category', 'name slug')
      .populate('topics', 'name slug')
      .sort({ updatedAt: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize),
    Article.countDocuments(filter)
  ]);
  return { articles, total, page: currentPage, pages: Math.ceil(total / pageSize) };
};

const listMolecules = async ({ q } = {}) => {
  const filter = {};
  if (q) {
    const escaped = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { formula: { $regex: escaped, $options: 'i' } }
    ];
  }
  return Molecule.find(filter).sort({ featuredDate: 1, name: 1 });
};

const listVintage = async ({ q, era } = {}) => {
  const filter = {};
  if (q) {
    const escaped = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { pioneer: { $regex: escaped, $options: 'i' } },
      { historicalContext: { $regex: escaped, $options: 'i' } }
    ];
  }
  if (era) filter.era = era;
  return Vintage.find(filter).sort({ date: -1, updatedAt: -1 });
};

const getVintageById = async (id) => {
  const item = await Vintage.findById(id);
  if (!item) throw new ApiError(404, 'Vintage entry not found', 'VINTAGE_NOT_FOUND');
  return item;
};

const createArticle = async (data, adminUserId) => {
  const slug = data.slug
    ? slugify(data.slug)
    : slugify(data.title);

  const existing = await Article.findOne({ slug });

  if (existing) {
    throw new ApiError(
      409,
      'An article with this slug already exists',
      'DUPLICATE_SLUG'
    );
  }

  const publishedAt =
    data.status === 'published'
      ? new Date()
      : null;

  return Article.create({
    ...data,
    slug,
    publishedAt,
    createdBy: adminUserId,
    updatedBy: adminUserId
  });
};

const updateArticle = async (
  id,
  data,
  adminUserId
) => {
  const article = await Article.findById(id);

  if (!article) {
    throw new ApiError(
      404,
      'Article not found',
      'ARTICLE_NOT_FOUND'
    );
  }

  if (data.slug) {
    data.slug = slugify(data.slug);
  } else if (data.title) {
    data.slug = slugify(data.title);
  }

  if (
    data.status === 'published' &&
    article.status !== 'published'
  ) {
    data.publishedAt = new Date();
  }

  data.updatedBy = adminUserId;

  return Article.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true
    }
  );
};

const deleteArticle = async (id) => {
  const article =
    await Article.findByIdAndDelete(id);

  if (!article) {
    throw new ApiError(
      404,
      'Article not found',
      'ARTICLE_NOT_FOUND'
    );
  }

  return true;
};

// ======================================================
// CATEGORIES
// ======================================================

const createCategory = async (data) => {
  const slug = data.slug
    ? slugify(data.slug)
    : slugify(data.name);

  return Category.create({
    ...data,
    slug
  });
};

const updateCategory = async (
  id,
  data
) => {
  if (data.slug) {
    data.slug = slugify(data.slug);
  }

  return Category.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true
    }
  );
};

// ======================================================
// TOPICS
// ======================================================

const createTopic = async (data) => {
  const slug = data.slug
    ? slugify(data.slug)
    : slugify(data.name);

  return Topic.create({
    ...data,
    slug
  });
};

const updateTopic = async (
  id,
  data
) => {
  if (data.slug) {
    data.slug = slugify(data.slug);
  }

  return Topic.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true
    }
  );
};

// ======================================================
// MOLECULES
// ======================================================

const createMolecule = async (data) => {
  const slug = data.slug
    ? slugify(data.slug)
    : slugify(data.name);

  return Molecule.create({
    ...data,
    slug
  });
};

const updateMolecule = async (
  id,
  data
) => {
  if (data.slug) {
    data.slug = slugify(data.slug);
  }

  return Molecule.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true
    }
  );
};

// ======================================================
// QUIZZES
// ======================================================

const createQuiz = async (data) => {
  return Quiz.create(data);
};

const updateQuiz = async (
  id,
  data
) => {
  return Quiz.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true
    }
  );
};

// ======================================================
// CATEGORY HUB
// ======================================================

const upsertCategoryHub = async (
  data
) => {
  return CategoryHub.findOneAndUpdate(
    {
      category: data.category
    },
    data,
    {
      new: true,
      upsert: true,
      runValidators: true
    }
  );
};

// ======================================================
// VINTAGE ARCHIVE
// ======================================================

const createVintage = async (data) => {
  const slug = data.slug
    ? slugify(data.slug)
    : slugify(data.title);

  const existing = await Vintage.findOne({
    slug
  });

  if (existing) {
    throw new ApiError(
      409,
      'A vintage entry with this slug already exists',
      'DUPLICATE_SLUG'
    );
  }

  return Vintage.create({
    ...data,
    slug
  });
};

const updateVintage = async (
  id,
  data
) => {
  if (data.slug) {
    data.slug = slugify(data.slug);
  } else if (data.title) {
    data.slug = slugify(data.title);
  }

  const vintage =
    await Vintage.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true
      }
    );

  if (!vintage) {
    throw new ApiError(
      404,
      'Vintage entry not found',
      'VINTAGE_NOT_FOUND'
    );
  }

  return vintage;
};

const deleteVintage = async (id) => {
  const vintage =
    await Vintage.findByIdAndDelete(id);

  if (!vintage) {
    throw new ApiError(
      404,
      'Vintage entry not found',
      'VINTAGE_NOT_FOUND'
    );
  }

  return true;
};

const deleteMolecule = async (id) => {
  const molecule = await Molecule.findByIdAndDelete(id);
  if (!molecule) throw new ApiError(404, 'Molecule not found', 'MOLECULE_NOT_FOUND');
  return true;
};

const setMoleculeFeaturedDate = async (id, featuredDate) => {
  const molecule = await Molecule.findById(id);
  if (!molecule) throw new ApiError(404, 'Molecule not found', 'MOLECULE_NOT_FOUND');
  if (featuredDate) {
    const day = new Date(featuredDate);
    if (Number.isNaN(day.getTime())) {
      throw new ApiError(400, 'Provide a valid MOTD date', 'INVALID_MOTD_DATE');
    }
    day.setUTCHours(0, 0, 0, 0);
    const collision = await Molecule.findOne({ _id: { $ne: id }, featuredDate: day });
    if (collision) throw new ApiError(409, 'Another molecule is already scheduled for that date', 'MOTD_DATE_TAKEN');
    molecule.featuredDate = day;
  } else {
    molecule.featuredDate = undefined;
  }
  return molecule.save();
};

module.exports = {
  getDashboardStats,
  listArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  createCategory,
  updateCategory,
  createTopic,
  updateTopic,
  listMolecules,
  createMolecule,
  updateMolecule,
  deleteMolecule,
  setMoleculeFeaturedDate,
  createQuiz,
  updateQuiz,
  upsertCategoryHub,
  listVintage,
  getVintageById,
  createVintage,
  updateVintage,
  deleteVintage
};
