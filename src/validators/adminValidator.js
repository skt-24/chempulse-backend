const Joi = require('joi');
const ApiError = require('../utils/apiError');

const schemas = {
  article: Joi.object({
    title: Joi.string().trim().max(200).required(),
    slug: Joi.string().trim().lowercase(),
    excerpt: Joi.string().trim().max(500).required(),
    content: Joi.string().required(),
    author: Joi.object({
      name: Joi.string().required(),
      bio: Joi.string().allow(''),
      avatarUrl: Joi.string().allow('')
    }).required(),
    category: Joi.string().required(), // Category ObjectId
    topics: Joi.array().items(Joi.string()),
    heroImage: Joi.object({
      url: Joi.string().allow(''),
      caption: Joi.string().allow('')
    }),
    status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
    featured: Joi.boolean().default(false),
    readTimeMinutes: Joi.number().integer().min(1).default(3),
    sourceMetadata: Joi.object({
      journalName: Joi.string().allow(''),
      doi: Joi.string().allow(''),
      originalUrl: Joi.string().allow('')
    })
  }),

  category: Joi.object({
    name: Joi.string().trim().max(100).required(),
    slug: Joi.string().trim().lowercase(),
    description: Joi.string().trim().max(500).allow(''),
    icon: Joi.object({
      name: Joi.string().default('flask'),
      url: Joi.string().allow('')
    }),
    displayOrder: Joi.number().integer().default(0),
    parentCategory: Joi.string().allow(null),
    active: Joi.boolean().default(true),
    featured: Joi.boolean().default(false)
  }),

  topic: Joi.object({
    name: Joi.string().trim().max(100).required(),
    slug: Joi.string().trim().lowercase(),
    description: Joi.string().trim().allow(''),
    trendingScore: Joi.number().default(0),
    isTrending: Joi.boolean().default(false),
    active: Joi.boolean().default(true)
  }),

  molecule: Joi.object({
    name: Joi.string().trim().required(),
    slug: Joi.string().trim().lowercase(),
    formula: Joi.string().trim().required(),
    molarMass: Joi.number().required(),
    description: Joi.string().required(),
    structureImage: Joi.object({
      url: Joi.string().allow(''),
      alt: Joi.string().allow('')
    }),
    commonUses: Joi.array().items(Joi.string().trim()),
    properties: Joi.object({
      density: Joi.string().allow(''),
      meltingPoint: Joi.string().allow(''),
      boilingPoint: Joi.string().allow(''),
      appearance: Joi.string().allow('')
    }),
    safetyNotes: Joi.string().allow(''),
    featuredDate: Joi.date().allow(null)
  }),

  quiz: Joi.object({
    title: Joi.string().trim().required(),
    description: Joi.string().allow(''),
    category: Joi.string().allow(null),
    topic: Joi.string().allow(null),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
    dateIndex: Joi.date().allow(null),
    active: Joi.boolean().default(true),
    questions: Joi.array()
      .items(
        Joi.object({
          questionText: Joi.string().required(),
          options: Joi.array().items(Joi.string().required()).min(2).required(),
          correctOptionIndex: Joi.number().integer().min(0).required(),
          explanation: Joi.string().required()
        })
      )
      .min(1)
      .required()
  }),

  hub: Joi.object({
    category: Joi.string().required(), // Category ObjectId
    heroTitle: Joi.string().required(),
    heroDescription: Joi.string().required(),
    heroImageUrl: Joi.string().allow(''),
    statistics: Joi.array().items(
      Joi.object({
        label: Joi.string().required(),
        value: Joi.string().required(),
        unit: Joi.string().allow(''),
        description: Joi.string().allow('')
      })
    ),
    subtopics: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        slug: Joi.string().required(),
        description: Joi.string().allow(''),
        icon: Joi.string().allow('')
      })
    ),
    featuredArticles: Joi.array().items(Joi.string())
  })
};

const validateAdminPayload = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) return next();

    const isUpdate = req.method === 'PUT' || req.method === 'PATCH';
    const validationSchema = isUpdate ? schema.fork(Object.keys(schema.describe().keys), (s) => s.optional()) : schema;

    const { error, value } = validationSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map((d) => d.message);
      return next(new ApiError(400, 'Invalid administrative payload', 'INVALID_INPUT', details));
    }

    req.body = value;
    next();
  };
};

module.exports = { validateAdminPayload };