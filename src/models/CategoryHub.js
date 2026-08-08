const mongoose = require('mongoose');

const subtopicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '' }
  },
  { _id: false }
);

const statisticSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
    unit: { type: String, default: '' },
    description: { type: String, default: '' }
  },
  { _id: false }
);

const categoryHubSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      unique: true,
      index: true
    },
    heroTitle: {
      type: String,
      required: [true, 'Hero title is required']
    },
    heroDescription: {
      type: String,
      required: [true, 'Hero description is required']
    },
    heroImageUrl: {
      type: String,
      default: ''
    },
    statistics: [statisticSchema],
    subtopics: [subtopicSchema],
    featuredArticles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article'
      }
    ],
    isDemoData: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CategoryHub', categoryHubSchema);