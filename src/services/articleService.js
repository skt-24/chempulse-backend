const Article = require('../models/Article');
const Category = require('../models/Category');
const Topic = require('../models/Topic');
const Bookmark = require('../models/Bookmark');
const ApiError = require('../utils/apiError');

const getArticles = async (queryParams) => {
  const { page = 1, limit = 10, category, topic, sort = 'newest' } = queryParams;

  // Strict public filter: Published articles only
  const filter = { status: 'published' };

  if (category) {
    const categoryDoc = await Category.findOne({ slug: category });
    if (categoryDoc) {
      filter.category = categoryDoc._id;
    } else {
      // Return empty pagination if requested category doesn't exist
      return {
        articles: [],
        pagination: { total: 0, page: Number(page), limit: Number(limit), pages: 0 }
      };
    }
  }

  if (topic) {
    const topicDoc = await Topic.findOne({ slug: topic });
    if (topicDoc) {
      filter.topics = topicDoc._id;
    } else {
      return {
        articles: [],
        pagination: { total: 0, page: Number(page), limit: Number(limit), pages: 0 }
      };
    }
  }

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
      .select('title slug excerpt author category heroImage readTimeMinutes publishedAt featured')
      .populate('category', 'name slug icon')
      .populate('topics', 'name slug')
      .lean(),
    Article.countDocuments(filter)
  ]);

  return {
    articles,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  };
};

const getArticleBySlug = async (slug, userId = null) => {
  const article = await Article.findOne({ slug, status: 'published' })
    .populate('category', 'name slug icon description')
    .populate('topics', 'name slug description')
    .lean();

  if (!article) {
    throw new ApiError(404, 'Article not found', 'ARTICLE_NOT_FOUND');
  }

  let isBookmarked = false;
  if (userId) {
    const bookmark = await Bookmark.findOne({
      user: userId,
      targetId: article._id,
      targetType: 'Article'
    }).lean();
    isBookmarked = !!bookmark;
  }

  return {
    ...article,
    isBookmarked
  };
};

const getFeaturedArticles = async (limit = 5) => {
  return Article.find({ status: 'published', featured: true })
    .sort({ publishedAt: -1 })
    .limit(Number(limit))
    .select('title slug excerpt author category heroImage readTimeMinutes publishedAt featured')
    .populate('category', 'name slug icon')
    .lean();
};

module.exports = {
  getArticles,
  getArticleBySlug,
  getFeaturedArticles
};