const homeService = require('../services/homeService');
const { sendSuccess } = require('../utils/apiResponse');

const getHomeFeed = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : null;
    const feedData = await homeService.getHomeFeed(userId);
    sendSuccess(res, 200, feedData);
  } catch (err) {
    next(err);
  }
};

module.exports = { getHomeFeed };