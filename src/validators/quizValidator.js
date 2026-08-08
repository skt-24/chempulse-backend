const Joi = require('joi');
const ApiError = require('../utils/apiError');

const validateSubmitQuiz = (req, res, next) => {
  const schema = Joi.object({
    answers: Joi.array()
      .items(
        Joi.object({
          questionId: Joi.string().required(),
          selectedOptionIndex: Joi.number().integer().min(0).required()
        })
      )
      .min(1)
      .required()
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const details = error.details.map((d) => d.message);
    return next(new ApiError(400, 'Invalid quiz submission format', 'INVALID_INPUT', details));
  }

  req.body = value;
  next();
};

module.exports = { validateSubmitQuiz };