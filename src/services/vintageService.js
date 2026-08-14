const Vintage = require('../models/Vintage');
const ApiError = require('../utils/apiError');
const { slugify } = require('../utils/slugify');


// ======================================================
// GET ALL
// ======================================================

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


// ======================================================
// GET BY SLUG
// ======================================================

const getVintageBySlug = async (slug) => {
  const item = await Vintage.findOne({
    slug,
    published: true
  }).lean();

  if (!item) {
    throw new ApiError(
      404,
      'Vintage entry not found',
      'VINTAGE_NOT_FOUND'
    );
  }

  return item;
};


// ======================================================
// CREATE
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


// ======================================================
// UPDATE
// ======================================================

const updateVintage = async (id, data) => {
  if (data.slug) {
    data.slug = slugify(data.slug);
  } else if (data.title) {
    data.slug = slugify(data.title);
  }

  const item = await Vintage.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true
    }
  );

  if (!item) {
    throw new ApiError(
      404,
      'Vintage entry not found',
      'VINTAGE_NOT_FOUND'
    );
  }

  return item;
};


// ======================================================
// DELETE
// ======================================================

const deleteVintage = async (id) => {
  const item =
    await Vintage.findByIdAndDelete(id);

  if (!item) {
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