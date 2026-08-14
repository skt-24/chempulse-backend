const mongoose = require('mongoose');

const vintageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Vintage title is required'],
      trim: true,
      maxlength: 200
    },

    slug: {
      type: String,
      required: [true, 'Vintage slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    description: {
      type: String,
      required: [true, 'Vintage description is required'],
      trim: true,
      maxlength: 500
    },

    date: {
      type: String,
      required: [true, 'Historical date is required'],
      trim: true
    },

    category: {
      type: String,
      required: [true, 'Vintage category is required'],
      enum: ['alchemy', 'classic-labs', 'archive-qa']
    },

    imageUrl: {
      type: String,
      default: ''
    },

    content: {
      type: String,
      required: [true, 'Vintage content is required']
    },

    featured: {
      type: Boolean,
      default: false
    },

    published: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

vintageSchema.index({
  title: 'text',
  description: 'text',
  content: 'text'
});

module.exports = mongoose.model('Vintage', vintageSchema);