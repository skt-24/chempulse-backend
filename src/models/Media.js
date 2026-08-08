const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true
    },
    filename: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true,
      enum: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    },
    sizeBytes: {
      type: Number,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    storageKey: {
      type: String,
      required: true
    },
    storageProvider: {
      type: String,
      enum: ['local', 's3', 'cloudinary'],
      default: 'local'
    },
    folder: {
      type: String,
      enum: ['avatars', 'heroes', 'molecules', 'categories', 'general'],
      default: 'general'
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Media', mediaSchema);