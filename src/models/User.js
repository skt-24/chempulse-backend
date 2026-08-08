const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { hashToken, generateRandomToken } = require('../utils/crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false
    },
    avatarUrl: {
      type: String,
      default: ''
    },
    roles: {
      type: [String],
      enum: ['user', 'editor', 'admin'],
      default: ['user']
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    notificationPreferences: {
      dailyAlerts: { type: Boolean, default: true },
      quizReminders: { type: Boolean, default: true },
      researchAlerts: { type: Boolean, default: true },
      quizzes: { type: Boolean, default: true },
      moleculeOfTheDay: { type: Boolean, default: true },
      systemAnnouncements: { type: Boolean, default: true },
      categoryAnnouncements: { type: Boolean, default: true }
    },
    resetPasswordToken: {
      type: String,
      select: false
    },
    resetPasswordExpires: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = generateRandomToken(32);
  this.resetPasswordToken = hashToken(resetToken);
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return resetToken;
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);