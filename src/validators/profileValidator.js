const Joi = require('joi');
const ApiError = require('../utils/apiError');

const validateUpdateProfile = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().trim().max(100),
    avatarUrl: Joi.string().uri().allow(''),

    notificationPreferences: Joi.object({
      dailyAlerts: Joi.boolean(),
      quizReminders: Joi.boolean(),
      researchAlerts: Joi.boolean(),
      quizzes: Joi.boolean(),
      moleculeOfTheDay: Joi.boolean(),
      systemAnnouncements: Joi.boolean(),
      categoryAnnouncements: Joi.boolean()
    })
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const details = error.details.map((d) => d.message);

    return next(
      new ApiError(
        400,
        'Invalid profile update data',
        'INVALID_INPUT',
        details
      )
    );
  }

  // Only validated/allowed fields continue to controller
  req.body = value;

  next();
};

module.exports = { validateUpdateProfile };