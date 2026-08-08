const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    excerpt: {
      type: String,
      required: [true, 'Excerpt is required'],
      trim: true,
      maxlength: [500, 'Excerpt cannot exceed 500 characters']
    },
    content: {
      type: String,
      required: [true, 'Content is required']
    },
    author: {
      name: { type: String, required: true },
      bio: { type: String, default: '' },
      avatarUrl: { type: String, default: '' }
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category reference is required'],
      index: true
    },
    topics: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic',
        index: true
      }
    ],
    heroImage: {
      url: { type: String, default: '' },
      caption: { type: String, default: '' }
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true
    },
    featured: {
      type: Boolean,
      default: false,
      index: true
    },
    publishedAt: {
      type: Date,
      default: null
    },
    readTimeMinutes: {
      type: Number,
      default: 3
    },
    // --- INGESTION & ATTRIBUTION METADATA ---
    source: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Source',
      default: null,
      index: true
    },
    externalId: {
      type: String,
      default: null,
      index: true
    },
    canonicalUrl: {
      type: String,
      default: null
    },
    attributionText: {
      type: String,
      default: ''
    },
    license: {
      type: String,
      default: ''
    },
    ingestedAt: {
      type: Date,
      default: null
    },
    ingestionStatus: {
      type: String,
      enum: ['none', 'pending_review', 'approved', 'rejected'],
      default: 'none',
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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

// Compound Indexes
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ category: 1, status: 1, publishedAt: -1 });
articleSchema.index({ status: 1, featured: -1, publishedAt: -1 });
articleSchema.index(
  { source: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      source: { $type: 'objectId' },
      externalId: { $type: 'string' }
    }
  }
);

articleSchema.index({
  title: 'text',
  excerpt: 'text',
  content: 'text'
});

module.exports = mongoose.model('Article', articleSchema);