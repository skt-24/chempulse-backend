const Joi = require('joi');
const ApiError = require('../utils/apiError');

const schemas = {
  signup: Joi.object({
    name: Joi.string().trim().max(100).required(),
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().min(8).max(128).required()
  }),
  login: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().required()
  }),
  refresh: Joi.object({
    refreshToken: Joi.string().required()
  }),
  logout: Joi.object({
    refreshToken: Joi.string().required()
  }),
  forgotPassword: Joi.object({
    email: Joi.string().email().lowercase().trim().required()
  }),
  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required()
  })
};

const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) return next();

    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map((d) => d.message);
      return next(new ApiError(400, 'Validation Error', 'INVALID_INPUT', details));
    }
    req.body = value;
    next();
  };
};

module.exports = validate;