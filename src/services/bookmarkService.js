const Bookmark = require('../models/Bookmark');
const Article = require('../models/Article');
const Molecule = require('../models/Molecule');
const ApiError = require('../utils/apiError');

const addBookmark = async (userId, targetId, targetType) => {
  // 1. Validate target resource existence
  let targetExists = false;
  if (targetType === 'Article') {
    targetExists = await Article.exists({ _id: targetId, status: 'published' });
  } else if (targetType === 'Molecule') {
    targetExists = await Molecule.exists({ _id: targetId });
  }

  if (!targetExists) {
    throw new ApiError(404, `${targetType} not found or unavailable`, 'RESOURCE_NOT_FOUND');
  }

  // 2. Prevent duplicate bookmarks
  const existing = await Bookmark.findOne({
    user: userId,
    targetId,
    targetType
  });

  if (existing) {
    return { bookmark: existing, newlyCreated: false };
  }

  const bookmark = await Bookmark.create({
    user: userId,
    targetId,
    targetType
  });

  return { bookmark, newlyCreated: true };
};

const removeBookmark = async (userId, targetId, targetType) => {
  const result = await Bookmark.findOneAndDelete({
    user: userId,
    targetId,
    targetType
  });

  if (!result) {
    throw new ApiError(404, 'Bookmark not found', 'BOOKMARK_NOT_FOUND');
  }

  return true;
};

const getUserBookmarks = async (userId, queryParams) => {
  const { page = 1, limit = 10, type = 'all' } = queryParams;

  const filter = { user: userId };
  if (type === 'article') {
    filter.targetType = 'Article';
  } else if (type === 'molecule') {
    filter.targetType = 'Molecule';
  }

  const skip = (page - 1) * limit;

  const [bookmarks, total] = await Promise.all([
    Bookmark.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Bookmark.countDocuments(filter)
  ]);

  // Hydrate bookmark summaries dynamically
  const articleIds = bookmarks.filter((b) => b.targetType === 'Article').map((b) => b.targetId);
  const moleculeIds = bookmarks.filter((b) => b.targetType === 'Molecule').map((b) => b.targetId);

  const [articles, molecules] = await Promise.all([
    Article.find({ _id: { $in: articleIds } })
      .select('title slug excerpt author heroImage readTimeMinutes publishedAt')
      .populate('category', 'name slug')
      .lean(),
    Molecule.find({ _id: { $in: moleculeIds } })
      .select('name slug formula molarMass description structureImage')
      .lean()
  ]);

  const articleMap = new Map(articles.map((a) => [a._id.toString(), a]));
  const moleculeMap = new Map(molecules.map((m) => [m._id.toString(), m]));

  const hydratedBookmarks = bookmarks.map((b) => {
    const targetKey = b.targetId.toString();
    const targetData = b.targetType === 'Article' ? articleMap.get(targetKey) : moleculeMap.get(targetKey);

    return {
      id: b._id,
      targetType: b.targetType,
      targetId: b.targetId,
      bookmarkedAt: b.createdAt,
      item: targetData || null
    };
  });

  return {
    bookmarks: hydratedBookmarks,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  };
};

module.exports = {
  addBookmark,
  removeBookmark,
  getUserBookmarks
};