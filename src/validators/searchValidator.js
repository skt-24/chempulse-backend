const Joi = require('joi');
const ApiError = require('../utils/apiError');

const validateSearch = (req, res, next) => {
  const schema = Joi.object({
    q: Joi.string().trim().min(1).max(200).required(),
    type: Joi.string().valid('all', 'article', 'topic', 'category', 'molecule').default('all'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10)
  });

  const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map((d) => d.message);
    return next(new ApiError(400, 'Invalid search query', 'INVALID_INPUT', details));
  }

  req.query = value;
  next();
};

module.exports = { validateSearch };