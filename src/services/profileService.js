const User = require('../models/User');
const ApiError = require('../utils/apiError');

const getProfile = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new ApiError(404, 'User profile not found', 'USER_NOT_FOUND');
  }
  return user;
};

const updateProfile = async (userId, updateData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User profile not found', 'USER_NOT_FOUND');
  }

  // Update safe scalar fields
  if (updateData.name !== undefined) {
    user.name = updateData.name;
  }
  if (updateData.avatarUrl !== undefined) {
    user.avatarUrl = updateData.avatarUrl;
  }

  // Merge notification preferences
  if (updateData.notificationPreferences) {
    user.notificationPreferences = {
      ...user.notificationPreferences.toObject(),
      ...updateData.notificationPreferences
    };
  }

  await user.save();
  return user;
};

module.exports = {
  getProfile,
  updateProfile
};