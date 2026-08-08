const Molecule = require('../models/Molecule');
const Bookmark = require('../models/Bookmark');
const ApiError = require('../utils/apiError');

/**
 * Returns consistent UTC start and end bounds for today
 */
const getUTCTodayBounds = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
};

const getMoleculeOfTheDay = async (userId = null) => {
  const { start, end } = getUTCTodayBounds();

  // 1. Try fetching explicitly scheduled MOTD for today's UTC date
  let molecule = await Molecule.findOne({
    featuredDate: { $gte: start, $lte: end }
  }).lean();

  // 2. Deterministic Fallback Engine if no explicit MOTD is assigned today
  if (!molecule) {
    const totalCount = await Molecule.countDocuments();
    if (totalCount === 0) {
      return { molecule: null, isBookmarked: false };
    }

    // Days elapsed since Unix Epoch (UTC)
    const daysSinceEpoch = Math.floor(start.getTime() / (1000 * 60 * 60 * 24));
    const deterministicIndex = daysSinceEpoch % totalCount;

    molecule = await Molecule.findOne()
      .skip(deterministicIndex)
      .sort({ createdAt: 1 })
      .lean();
  }

  let isBookmarked = false;
  if (userId && molecule) {
    const bookmark = await Bookmark.findOne({
      user: userId,
      targetId: molecule._id,
      targetType: 'Molecule'
    }).lean();
    isBookmarked = !!bookmark;
  }

  return {
    molecule,
    isBookmarked,
    date: start.toISOString().split('T')[0] // Return YYYY-MM-DD UTC
  };
};

const getMoleculeBySlug = async (slug, userId = null) => {
  const molecule = await Molecule.findOne({ slug }).lean();
  if (!molecule) {
    throw new ApiError(404, 'Molecule not found', 'MOLECULE_NOT_FOUND');
  }

  let isBookmarked = false;
  if (userId) {
    const bookmark = await Bookmark.findOne({
      user: userId,
      targetId: molecule._id,
      targetType: 'Molecule'
    }).lean();
    isBookmarked = !!bookmark;
  }

  return {
    ...molecule,
    isBookmarked
  };
};

const getMolecules = async (queryParams) => {
  const { page = 1, limit = 10, search, sort = 'name' } = queryParams;

  const filter = {};
  if (search) {
    const regex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { formula: regex }, { commonUses: regex }];
  }

  let sortOption = { name: 1 };
  if (sort === 'molarMassAsc') {
    sortOption = { molarMass: 1 };
  } else if (sort === 'molarMassDesc') {
    sortOption = { molarMass: -1 };
  } else if (sort === 'newest') {
    sortOption = { createdAt: -1 };
  }

  const boundedLimit = Math.min(Number(limit), 50);
  const skip = (page - 1) * boundedLimit;

  const [molecules, total] = await Promise.all([
    Molecule.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(boundedLimit)
      .select('name slug formula molarMass description structureImage commonUses properties')
      .lean(),
    Molecule.countDocuments(filter)
  ]);

  return {
    molecules,
    pagination: {
      total,
      page: Number(page),
      limit: boundedLimit,
      pages: Math.ceil(total / boundedLimit)
    }
  };
};

const getRelatedMolecules = async (slug, limit = 4) => {
  const currentMolecule = await Molecule.findOne({ slug }).lean();
  if (!currentMolecule) {
    throw new ApiError(404, 'Molecule not found', 'MOLECULE_NOT_FOUND');
  }

  const boundedLimit = Math.min(Number(limit), 10);

  const related = await Molecule.find({
    _id: { $ne: currentMolecule._id }
  })
    .limit(boundedLimit)
    .select('name slug formula molarMass description structureImage')
    .lean();

  return related;
};

module.exports = {
  getMoleculeOfTheDay,
  getMoleculeBySlug,
  getMolecules,
  getRelatedMolecules
};