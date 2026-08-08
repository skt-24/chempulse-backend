const Source = require('../models/Source');
const Article = require('../models/Article');
const ApiError = require('../utils/apiError');
const { slugify } = require('../utils/slugify');
const DemoSourceAdapter = require('../adapters/DemoSourceAdapter');

const adapterRegistry = {
  open_access: DemoSourceAdapter,
  manual: DemoSourceAdapter,
  api: DemoSourceAdapter,
  rss: DemoSourceAdapter
};

const registerSource = async (sourceData) => {
  const slug = slugify(sourceData.name);
  const existing = await Source.findOne({ slug });
  if (existing) {
    throw new ApiError(409, 'Source already exists with this name', 'DUPLICATE_SOURCE');
  }

  return Source.create({ ...sourceData, slug });
};

const runIngestionForSource = async (sourceId) => {
  const source = await Source.findById(sourceId);
  if (!source || !source.active) {
    throw new ApiError(404, 'Active source not found', 'SOURCE_NOT_FOUND');
  }

  const AdapterClass = adapterRegistry[source.type] || DemoSourceAdapter;
  const adapter = new AdapterClass(source);

  const rawItems = await adapter.fetch();
  const ingestedArticles = [];
  let skippedDuplicates = 0;

  for (const rawItem of rawItems) {
    const normalized = adapter.normalize(rawItem);

    // 1. Deduplication check: External ID + Source combination OR Canonical URL match
    const isDuplicate = await Article.exists({
      $or: [
        { source: source._id, externalId: normalized.externalId },
        { canonicalUrl: normalized.canonicalUrl }
      ]
    });

    if (isDuplicate) {
      skippedDuplicates++;
      continue;
    }

    const slug = slugify(normalized.title);
    const isAutoPublished = source.autoPublish;

    const article = await Article.create({
      title: normalized.title,
      slug,
      excerpt: normalized.excerpt,
      content: normalized.content,
      author: normalized.author,
      category: source.defaultCategory,
      source: source._id,
      externalId: normalized.externalId,
      canonicalUrl: normalized.canonicalUrl,
      attributionText: normalized.attributionText,
      license: normalized.license,
      ingestedAt: new Date(),
      publishedAt: isAutoPublished ? normalized.publishedAt || new Date() : null,
      status: isAutoPublished ? 'published' : 'draft',
      ingestionStatus: isAutoPublished ? 'approved' : 'pending_review'
    });

    ingestedArticles.push(article);
  }

  source.lastIngestedAt = new Date();
  await source.save();

  return {
    sourceName: source.name,
    fetchedCount: rawItems.length,
    ingestedCount: ingestedArticles.length,
    skippedDuplicates,
    ingestedArticles
  };
};

const getReviewQueue = async (queryParams) => {
  const { page = 1, limit = 10 } = queryParams;
  const skip = (page - 1) * limit;

  const filter = { ingestionStatus: 'pending_review' };

  const [articles, total] = await Promise.all([
    Article.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('source', 'name slug type')
      .populate('category', 'name slug')
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

const reviewIngestedArticle = async (articleId, action, adminUserId) => {
  const article = await Article.findById(articleId);
  if (!article || article.ingestionStatus !== 'pending_review') {
    throw new ApiError(404, 'Article pending review not found', 'ARTICLE_NOT_FOUND');
  }

  if (action === 'approve') {
    article.status = 'published';
    article.ingestionStatus = 'approved';
    article.publishedAt = new Date();
    article.updatedBy = adminUserId;
  } else if (action === 'reject') {
    article.status = 'archived';
    article.ingestionStatus = 'rejected';
    article.updatedBy = adminUserId;
  } else {
    throw new ApiError(400, 'Invalid review action. Must be approve or reject', 'INVALID_INPUT');
  }

  await article.save();
  return article;
};

module.exports = {
  registerSource,
  runIngestionForSource,
  getReviewQueue,
  reviewIngestedArticle
};