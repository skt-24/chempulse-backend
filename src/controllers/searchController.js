const searchService = require('../services/searchService');
const { sendSuccess } = require('../utils/apiResponse');

const search = async (req, res, next) => {
  try {
    const result = await searchService.search(req.query);
    sendSuccess(res, 200, result);
  } catch (err) {
    next(err);
  }
};

module.exports = { search };