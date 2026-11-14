const Topic = require('../models/Topic');
const Molecule = require('../models/Molecule');
const Notification = require('../models/Notification');

const getHomeFeed = async (userId = null, options = {}) => {
  const trendingLimit = options.trendingLimit || 5;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    trendingTopics,
    scheduledMotd,
    totalMoleculesCount,
    unreadNotificationCount
  ] = await Promise.all([
    Topic.find({ active: true, isTrending: true })
      .sort({ trendingScore: -1 })
      .limit(trendingLimit)
      .select('name slug description trendingScore')
      .lean(),

    Molecule.findOne({
      featuredDate: { $gte: todayStart, $lte: todayEnd }
    })
      .select('name slug formula molarMass description structureImage commonUses properties')
      .lean(),

    Molecule.countDocuments(),

    userId
      ? Notification.countDocuments({ user: userId, isRead: false })
      : Promise.resolve(0)
  ]);

  let moleculeOfTheDay = scheduledMotd;

  if (!moleculeOfTheDay && totalMoleculesCount > 0) {
    const daysSinceEpoch = Math.floor(
      todayStart.getTime() / (1000 * 60 * 60 * 24)
    );

    const deterministicIndex = daysSinceEpoch % totalMoleculesCount;

    moleculeOfTheDay = await Molecule.findOne()
      .skip(deterministicIndex)
      .select('name slug formula molarMass description structureImage commonUses properties')
      .lean();
  }

  return {
    trendingTopics: trendingTopics || [],
    headlines: [],
    moleculeOfTheDay: moleculeOfTheDay || null,
    unreadNotificationCount: unreadNotificationCount || 0
  };
};

module.exports = { getHomeFeed };