const Article = require('../models/Article');
const Molecule = require('../models/Molecule');

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const search = async (queryParams = {}) => {
  const q = String(queryParams.q || '').trim();

  // Always return the Android-compatible structure
  if (!q) {
    return {
      articles: [],
      molecules: []
    };
  }

  const regex = new RegExp(escapeRegex(q), 'i');

  // ======================================================
  // ARTICLES
  // ======================================================

  const articles = await Article.aggregate([
    // Only published articles should appear in public search
    {
      $match: {
        status: 'published'
      }
    },

    // Category reference -> actual Category document
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryData'
      }
    },

    // Topics references -> actual Topic documents
    {
      $lookup: {
        from: 'topics',
        localField: 'topics',
        foreignField: '_id',
        as: 'topicData'
      }
    },

    // Search across article + referenced documents
    {
      $match: {
        $or: [
          // Article title
          {
            title: {
              $regex: regex
            }
          },

          // Article excerpt = subtitle equivalent
          {
            excerpt: {
              $regex: regex
            }
          },

          // Category name
          {
            'categoryData.name': {
              $regex: regex
            }
          },

          // Category slug
          {
            'categoryData.slug': {
              $regex: regex
            }
          },

          // Topic/tag name
          {
            'topicData.name': {
              $regex: regex
            }
          },

          // Topic/tag slug
          {
            'topicData.slug': {
              $regex: regex
            }
          }
        ]
      }
    },

    // Newest articles first
    {
      $sort: {
        publishedAt: -1,
        createdAt: -1
      }
    },

    {
      $limit: 50
    },

    // Return only what the Android app needs
    {
      $project: {
        _id: 1,
        title: 1,
        slug: 1,
        excerpt: 1,
        author: 1,
        heroImage: 1,
        publishedAt: 1,
        readTimeMinutes: 1,

        categoryData: 1,
        topicData: 1
      }
    }
  ]);

  // ======================================================
  // MOLECULES
  // ======================================================

  const molecules = await Molecule.find({
    $or: [
      {
        name: {
          $regex: regex
        }
      },
      {
        slug: {
          $regex: regex
        }
      },
      {
        formula: {
          $regex: regex
        }
      },
      {
        description: {
          $regex: regex
        }
      },
      {
        commonUses: {
          $regex: regex
        }
      }
    ]
  })
    .sort({
      name: 1
    })
    .limit(50)
    .lean();

  // ======================================================
  // ANDROID RESPONSE FORMAT
  // ======================================================

  return {
    articles: articles.map((article) => ({
      id: article._id,

      title: article.title,

      // Android can use subtitle directly
      subtitle: article.excerpt || '',

      slug: article.slug,

      excerpt: article.excerpt || '',

      author: article.author
        ? {
            name: article.author.name || '',
            bio: article.author.bio || '',
            avatarUrl: article.author.avatarUrl || ''
          }
        : null,

      category:
        article.categoryData &&
        article.categoryData.length > 0
          ? {
              id: article.categoryData[0]._id,
              name: article.categoryData[0].name,
              slug: article.categoryData[0].slug
            }
          : null,

      // Topics become tags for Android
      tags: Array.isArray(article.topicData)
        ? article.topicData.map((topic) => ({
            id: topic._id,
            name: topic.name,
            slug: topic.slug
          }))
        : [],

      heroImage: article.heroImage?.url || '',

      publishedAt: article.publishedAt,

      readTimeMinutes:
        article.readTimeMinutes || 3
    })),

    molecules: molecules.map((molecule) => ({
      id: molecule._id,

      name: molecule.name,

      slug: molecule.slug,

      formula: molecule.formula,

      molarMass: molecule.molarMass,

      description: molecule.description,

      structureImage:
        molecule.structureImage?.url || '',

      commonUses:
        Array.isArray(molecule.commonUses)
          ? molecule.commonUses
          : []
    }))
  };
};

module.exports = {
  search
};