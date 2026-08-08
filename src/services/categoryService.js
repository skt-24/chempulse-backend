const Category = require('../models/Category');
const CategoryHub = require('../models/CategoryHub');
const Article = require('../models/Article');
const ApiError = require('../utils/apiError');

const getCategories = async () => {
  const categories = await Category.find({ active: true })
    .sort({ displayOrder: 1, name: 1 })
    .populate('articleCount')
    .lean();

  return categories.map((cat) => ({
    ...cat,
    articleCount: cat.articleCount || 0
  }));
};

const getCategoryBySlug = async (slug) => {
  const category = await Category.findOne({ slug, active: true })
    .populate('articleCount')
    .lean();

  if (!category) {
    throw new ApiError(404, 'Category not found', 'CATEGORY_NOT_FOUND');
  }

  // Check if a specialized hub configuration exists for this category
  const hasHub = await CategoryHub.exists({ category: category._id });

  return {
    ...category,
    articleCount: category.articleCount || 0,
    hasSpecializedHub: !!hasHub
  };
};

const getCategoryArticles = async (slug, queryParams) => {
  const { page = 1, limit = 10, sort = 'newest' } = queryParams;

  const category = await Category.findOne({ slug, active: true }).lean();
  if (!category) {
    throw new ApiError(404, 'Category not found', 'CATEGORY_NOT_FOUND');
  }

  const filter = {
    category: category._id,
    status: 'published'
  };

  let sortOption = { publishedAt: -1 };
  if (sort === 'oldest') {
    sortOption = { publishedAt: 1 };
  } else if (sort === 'readTime') {
    sortOption = { readTimeMinutes: -1 };
  }

  const skip = (page - 1) * limit;

  const [articles, total] = await Promise.all([
    Article.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .select('title slug excerpt author heroImage readTimeMinutes publishedAt featured')
      .populate('topics', 'name slug')
      .lean(),
    Article.countDocuments(filter)
  ]);

  return {
    category: {
      name: category.name,
      slug: category.slug,
      description: category.description
    },
    articles,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  };
};

const getCategoryHub = async (slug) => {
  const category = await Category.findOne({ slug, active: true }).lean();
  if (!category) {
    throw new ApiError(404, 'Category not found', 'CATEGORY_NOT_FOUND');
  }

  const hub = await CategoryHub.findOne({ category: category._id })
    .populate({
      path: 'featuredArticles',
      match: { status: 'published' },
      select: 'title slug excerpt author heroImage readTimeMinutes publishedAt featured',
      populate: { path: 'category', select: 'name slug icon' }
    })
    .lean();

  if (!hub) {
    throw new ApiError(404, 'Specialized hub not configured for this category', 'HUB_NOT_FOUND');
  }

  return {
    category: {
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon
    },
    heroTitle: hub.heroTitle,
    heroDescription: hub.heroDescription,
    heroImageUrl: hub.heroImageUrl,
    statistics: hub.statistics || [],
    subtopics: hub.subtopics || [],
    featuredArticles: hub.featuredArticles || []
  };
};

module.exports = {
  getCategories,
  getCategoryBySlug,
  getCategoryArticles,
  getCategoryHub
};