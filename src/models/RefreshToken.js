const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0 // MongoDB TTL index auto-deletes expired documents
    },
    revoked: {
      type: Boolean,
      default: false
    },
    replacedByTokenHash: {
      type: String,
      default: null
    },
    createdByIp: String,
    userAgent: String
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);