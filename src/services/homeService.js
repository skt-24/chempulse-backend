const Topic = require('../models/Topic');
const Article = require('../models/Article');
const Molecule = require('../models/Molecule');
const Notification = require('../models/Notification'); // Lazy handle or mock check if model isn't yet created

const getHomeFeed = async (userId = null, options = {}) => {
  const trendingLimit = options.trendingLimit || 5;
  const headlinesLimit = options.headlinesLimit || 10;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Parallelized execution to optimize response latency
  const [trendingTopics, headlines, scheduledMotd, totalMoleculesCount, unreadNotificationCount] =
    await Promise.all([
      // 1. Trending Topics (Active, sorted by trendingScore)
      Topic.find({ active: true, isTrending: true })
        .sort({ trendingScore: -1 })
        .limit(trendingLimit)
        .select('name slug description trendingScore')
        .lean(),

      // 2. Today's Headlines (Card-level projections only, excluding article content body)
      Article.find({ status: 'published' })
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(headlinesLimit)
        .select('title slug excerpt author category heroImage readTimeMinutes publishedAt featured')
        .populate('category', 'name slug icon')
        .lean(),

      // 3. Molecule of the Day assigned specifically for today
      Molecule.findOne({
        featuredDate: { $gte: todayStart, $lte: todayEnd }
      })
        .select('name slug formula molarMass description structureImage commonUses properties')
        .lean(),

      // 4. Count for deterministic MOTD fallback computation
      Molecule.countDocuments(),

      // 5. Unread notification count for authenticated users
      userId && Notification ? Notification.countDocuments({ user: userId, isRead: false }) : Promise.resolve(0)
    ]);

  let moleculeOfTheDay = scheduledMotd;

  // Deterministic Fallback Engine if today's MOTD has not been explicitly assigned
  if (!moleculeOfTheDay && totalMoleculesCount > 0) {
    const daysSinceEpoch = Math.floor(todayStart.getTime() / (1000 * 60 * 60 * 24));
    const deterministicIndex = daysSinceEpoch % totalMoleculesCount;

    moleculeOfTheDay = await Molecule.findOne()
      .skip(deterministicIndex)
      .select('name slug formula molarMass description structureImage commonUses properties')
      .lean();
  }

  return {
    trendingTopics: trendingTopics || [],
    headlines: headlines || [],
    moleculeOfTheDay: moleculeOfTheDay || null,
    unreadNotificationCount: unreadNotificationCount || 0
  };
};

module.exports = { getHomeFeed };