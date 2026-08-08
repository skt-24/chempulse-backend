const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Source name is required'],
      trim: true,
      unique: true
    },
    slug: {
      type: String,
      required: [true, 'Source slug is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['rss', 'api', 'manual', 'open_access'],
      required: true
    },
    baseUrl: {
      type: String,
      trim: true
    },
    autoPublish: {
      type: Boolean,
      default: false // By default, ingested content stays in draft queue
    },
    defaultCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    licenseInfo: {
      type: String,
      default: 'Fair use / Lead summary with attribution'
    },
    lastIngestedAt: {
      type: Date,
      default: null
    },
    isDemoData: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Source', sourceSchema);