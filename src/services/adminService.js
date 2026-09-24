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

  // Molecule of the Day:
  // If a new featured molecule is created,
  // remove the previous featured molecule.
  if (data.featuredDate) {
    await Molecule.deleteMany({
      featuredDate: {
        $exists: true,
        $ne: null
      }
    });
  }

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

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  // Dashboard
  getDashboardStats,

  // Articles
  createArticle,
  updateArticle,
  deleteArticle,

  // Categories
  createCategory,
  updateCategory,

  // Topics
  createTopic,
  updateTopic,

  // Molecules
  createMolecule,
  updateMolecule,

  // Quizzes
  createQuiz,
  updateQuiz,

  // Category Hub
  upsertCategoryHub,

  // Vintage
  createVintage,
  updateVintage,
  deleteVintage
};