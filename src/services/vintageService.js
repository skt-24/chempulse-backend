const Vintage = require('../models/Vintage');
const ApiError = require('../utils/apiError');
const { slugify } = require('../utils/slugify');

// ==================== PUBLIC ====================

const getVintageItems = async (query = {}) => {
  const filter = {
    published: true
  };

  if (query.category) {
    filter.category = query.category;
  }

  return Vintage.find(filter)
    .sort({ createdAt: -1 })
    .lean();
};

const getVintageBySlug = async (slug) => {
  const vintage = await Vintage.findOne({
    slug,
    published: true
  }).lean();

  if (!vintage) {
    throw new ApiError(
      404,
      'Vintage entry not found',
      'VINTAGE_NOT_FOUND'
    );
  }

  return vintage;
};

// ==================== ADMIN ====================

const createVintage = async (data) => {
  const slug = data.slug
    ? slugify(data.slug)
    : slugify(data.title);

  const existing = await Vintage.findOne({ slug });

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

const updateVintage = async (id, data) => {
  if (data.slug) {
    data.slug = slugify(data.slug);
  } else if (data.title) {
    data.slug = slugify(data.title);
  }

  const vintage = await Vintage.findByIdAndUpdate(
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
  const vintage = await Vintage.findByIdAndDelete(id);

  if (!vintage) {
    throw new ApiError(
      404,
      'Vintage entry not found',
      'VINTAGE_NOT_FOUND'
    );
  }

  return true;
};

module.exports = {
  getVintageItems,
  getVintageBySlug,
  createVintage,
  updateVintage,
  deleteVintage
};