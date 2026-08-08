const Joi = require('joi');
const ApiError = require('../utils/apiError');

const validateGetArticles = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    category: Joi.string().trim(),
    topic: Joi.string().trim(),
    sort: Joi.string().valid('newest', 'oldest', 'readTime').default('newest')
  });

  const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map((d) => d.message);
    return next(new ApiError(400, 'Invalid query parameters', 'INVALID_INPUT', details));
  }

  req.query = value;
  next();
};

module.exports = { validateGetArticles };