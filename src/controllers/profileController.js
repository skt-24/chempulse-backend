const profileService = require('../services/profileService');
const { sendSuccess } = require('../utils/apiResponse');

const getProfile = async (req, res, next) => {
  try {
    const user = await profileService.getProfile(req.user._id);
    sendSuccess(res, 200, { user });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await profileService.updateProfile(req.user._id, req.body);
    sendSuccess(res, 200, { user });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile
};